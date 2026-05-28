import { NextFunction, Request, Response } from "express";
import { Exam } from "../models/Exam.model";
import { Student } from "../models/Student.model";
import { DeviceLog } from "../models/DeviceLog.model";
import { ExamSession } from "../models/ExamSession.model";
import { Answer } from "../models/Answer.model";
import { Question } from "../models/Question.model";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { isStudentAllowedForExam, resolveExamAccess } from "../services/teamsMembership.service";
import { buildRandomizedExam } from "../services/examRandomizer.service";
import { getCurrentQuestionPayload } from "../services/questionPresenter.service";
import { calculateAndSaveResult, gradeAnswer } from "../services/scoring.service";
import { signToken } from "../utils/jwt";

function elapsedSecondsFrom(date?: Date | string | null) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
}

async function safeNextQuestion(sessionId: string) {
  const fresh: any = await ExamSession.findById(sessionId);
  if (!fresh) return null;
  if (fresh.status !== "active") return null;
  return getCurrentQuestionPayload(sessionId);
}

async function finalizeIfNeeded(session: any, resultStatus: "submitted" | "banned_provisional" = "submitted") {
  const fresh: any = await ExamSession.findById(session._id);
  if (!fresh) return null;
  if (fresh.status === "submitted" || fresh.status === "banned_provisional") {
    return calculateAndSaveResult(fresh._id.toString(), fresh.status === "banned_provisional" ? "banned_provisional" : resultStatus);
  }
  return null;
}

async function advanceCurrentQuestion(session: any) {
  const currentIndex = Number(session.currentQuestionIndex || 0);
  const nextIndex = currentIndex + 1;
  const isDone = nextIndex >= (session.randomizedQuestionOrder || []).length;
  const update: any = {
    $set: {
      currentQuestionIndex: nextIndex,
      lastActivityAt: new Date(),
      ...(isDone ? { status: "submitted", submittedAt: new Date() } : {})
    },
    $unset: { currentQuestionDisplayedAt: "" }
  };
  const result = await ExamSession.updateOne({ _id: session._id, status: "active", currentQuestionIndex: currentIndex }, update);
  if (result.modifiedCount === 0) return { advanced: false, done: false, race: true };
  if (isDone) await calculateAndSaveResult(session._id.toString(), "submitted");
  return { advanced: true, done: isDone, race: false };
}

async function createAnswerOnce(payload: any) {
  try {
    return await Answer.create(payload);
  } catch (err: any) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

async function isMatchingCodeFallbackStudent(exam: any, student: any) {
  if (!exam?.allowCodeFallback || !exam?.accessCode || !student?.email) return false;

  const safeCode = String(exam.accessCode).toLowerCase().replace(/[^a-z0-9]/gi, "");
  const email = String(student.email).toLowerCase();

  return email === `code-${safeCode}@local.exam` || email.startsWith(`code-${safeCode}-`);
}

async function resolveAccessWithStoredFallback(exam: any, student: any, code?: string) {
  const access = await resolveExamAccess(exam, student, code);
  if (access.allowed) return access;
  if (await isMatchingCodeFallbackStudent(exam, student)) return { allowed: true, method: "code" };
  return access;
}


function buildDeviceFingerprint(payload: any, req: Request) {
  const parts = [
    payload?.deviceFingerprint,
    payload?.userAgent,
    payload?.deviceType,
    payload?.operatingSystem,
    payload?.browser,
    payload?.screenWidth,
    payload?.screenHeight,
    payload?.timezone,
    payload?.language
  ].filter(Boolean);
  if (!parts.length) parts.push(req.ip || "unknown");
  return parts.join("|").slice(0, 900);
}

function canRetake(session: any) {
  return Boolean(session?.retakeAllowedAt);
}

export async function listAvailableExams(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await Student.findById(req.auth?.id);
    if (!student) throw forbidden("Student not found");
    const exams = await Exam.find({ status: { $in: ["ready", "open", "closed", "completed"] } }).sort({ createdAt: -1 });
    const sessions = await ExamSession.find({ studentId: student._id });
    const sessionMap = new Map(sessions.map((session: any) => [String(session.examId), session]));
    const available = [];
    for (const exam of exams) {
      const allowed = await isStudentAllowedForExam(String(exam._id), student);
      if (!allowed && !exam.allowCodeFallback) continue;
      const session: any = sessionMap.get(String(exam._id));
      available.push({
        id: exam._id,
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        description: exam.description,
        status: exam.status,
        totalQuestions: exam.totalQuestions,
        perQuestionTimeSeconds: exam.perQuestionTimeSeconds,
        convertedTotalScore: exam.convertedTotalScore,
        codeFallbackAvailable: Boolean(exam.allowCodeFallback),
        teamsAccessAvailable: allowed,
        majorViolationLimit: exam.majorViolationLimit,
        banOnViolationNumber: exam.banOnViolationNumber,
        sessionId: session?._id || null,
        sessionStatus: session?.status || null,
        startedAt: session?.startedAt || null,
        submittedAt: session?.submittedAt || null,
        updatedAt: exam.updatedAt
      });
    }
    res.json({ exams: available });
  } catch (err) { next(err); }
}

export async function accessByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const code = String(req.body.code || req.query.code || "").trim();
    const studentName = String(req.body.studentName || "").trim();
    const studentCode = String(req.body.studentCode || "").trim();

    if (!code) {
      throw badRequest("Шалгалтын нууц үг оруулна уу.");
    }

    if (!studentName || studentName.length < 2) {
      throw badRequest("Овог нэрээ бүрэн оруулна уу.");
    }

    if (!studentCode || studentCode.length < 2) {
      throw badRequest("Оюутны код / сурагчийн дугаараа оруулна уу.");
    }

    const exam = await Exam.findOne({
      accessCode: code,
      allowCodeFallback: true,
      status: { $in: ["ready", "open"] }
    });

    if (!exam) {
      throw forbidden("Нууц үг буруу байна эсвэл шалгалт идэвхгүй байна.");
    }

    const safeExamCode = code.toLowerCase().replace(/[^a-z0-9]/gi, "");
    const safeStudentCode = studentCode.toLowerCase().replace(/[^a-z0-9]/gi, "");
    const fallbackEmail = `code-${safeExamCode}-${safeStudentCode}@local.exam`;

    let student = await Student.findOne({ email: fallbackEmail });

    if (!student) {
      student = await Student.create({
        microsoftUserId: `code-${safeExamCode}-${safeStudentCode}`,
        displayName: studentName,
        email: fallbackEmail,
        tenantId: "code-fallback",
        teamIds: [],
        studentCode,
        accessMethod: "code_fallback",
        lastLoginAt: new Date()
      });
    } else {
      student.displayName = studentName;
      student.studentCode = studentCode;
      student.accessMethod = "code_fallback";
      student.lastLoginAt = new Date();
      await student.save();
    }

    const existingSession = await ExamSession.findOne({
      examId: exam._id,
      studentId: student._id,
      status: { $in: ["submitted", "banned", "banned_provisional"] }
    });

    if (existingSession && existingSession.status === "submitted" && !existingSession.retakeAllowedAt) {
      throw forbidden("Та энэ шалгалтыг аль хэдийн илгээсэн байна. Дахин өгөх шаардлагатай бол багшид хандана уу.");
    }

    if (existingSession && String(existingSession.status).includes("banned") && !existingSession.retakeAllowedAt) {
      throw forbidden("Таны шалгалт түгжигдсэн байна. Багшид хандана уу.");
    }

    const token = signToken({
      sub: student._id.toString(),
      role: "student",
      email: student.email
    });

    res.json({
      token,
      student: {
        id: student._id,
        name: student.displayName,
        email: student.email,
        studentCode,
        accessMethod: "code_fallback"
      },
      exam: {
        id: exam._id,
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        description: exam.description,
        status: exam.status,
        totalQuestions: exam.totalQuestions,
        perQuestionTimeSeconds: exam.perQuestionTimeSeconds,
        majorViolationLimit: exam.majorViolationLimit,
        banOnViolationNumber: exam.banOnViolationNumber
      },
      accessMethod: "code_fallback",
      code
    });
  } catch (err) {
    next(err);
  }
}

export async function accessCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw notFound("Exam not found");
    const student = await Student.findById(req.auth?.id);
    if (!student) throw forbidden("Student not found");
    const code = String(req.query.code || req.body?.code || "");
    const access = await resolveAccessWithStoredFallback(exam, student, code);
    res.json({
      allowed: access.allowed,
      accessMethod: access.method,
      codeFallbackAvailable: Boolean(exam.allowCodeFallback),
      examStatus: exam.status,
      exam: { id: exam._id, title: exam.title, subject: exam.subject, description: exam.description, totalQuestions: exam.totalQuestions, perQuestionTimeSeconds: exam.perQuestionTimeSeconds, majorViolationLimit: exam.majorViolationLimit, banOnViolationNumber: exam.banOnViolationNumber }
    });
  } catch (err) { next(err); }
}

export async function deviceCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.auth?.id;
    if (!studentId) throw forbidden("Student required");
    const log = await DeviceLog.create({ studentId, examId: req.params.examId, ...req.body, ipAddress: req.ip });
    res.json({ accepted: true, deviceLog: log });
  } catch (err) { next(err); }
}

export async function acceptRules(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.auth?.id;
    let session: any = await ExamSession.findOne({ examId: req.params.examId, studentId });
    if (session && ["submitted", "banned", "banned_provisional"].includes(session.status) && !canRetake(session)) {
      return res.json({ sessionId: session._id, status: session.status, retakeAllowed: false, rulesAcceptedAt: session.rulesAcceptedAt });
    }
    if (session && ["submitted", "banned", "banned_provisional"].includes(session.status) && canRetake(session)) {
      await Answer.deleteMany({ examSessionId: session._id });
      session.status = "waiting";
      session.currentQuestionIndex = 0;
      session.randomizedQuestionOrder = [];
      session.randomizedAnswerMap = [];
      session.currentQuestionDisplayedAt = undefined;
      session.startedAt = undefined;
      session.submittedAt = undefined;
      session.bannedAt = undefined;
      session.majorViolationCount = 0;
      session.minorViolationCount = 0;
      session.lastMajorViolationAt = undefined;
      session.lastMajorViolationType = "";
      session.activeDeviceToken = "";
      session.deviceFingerprint = "";
      session.retakeAllowedAt = undefined;
      session.retakeAllowedByAdminId = undefined;
      session.retakeReason = "";
    }
    if (session && ["active"].includes(session.status)) {
      session.rulesAcceptedAt = session.rulesAcceptedAt || new Date();
      session.lastActivityAt = new Date();
      await session.save();
      return res.json({ sessionId: session._id, status: session.status, rulesAcceptedAt: session.rulesAcceptedAt });
    }
    session = await ExamSession.findOneAndUpdate(
      { examId: req.params.examId, studentId },
      { examId: req.params.examId, studentId, status: "waiting", rulesAcceptedAt: new Date(), lastActivityAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ sessionId: session._id, status: session.status, rulesAcceptedAt: session.rulesAcceptedAt });
  } catch (err) { next(err); }
}

export async function startExam(req: Request, res: Response, next: NextFunction) {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw notFound("Exam not found");
    if (exam.status !== "open") throw forbidden("Exam is not open yet");
    const student = await Student.findById(req.auth?.id);
    if (!student) throw forbidden("Student not found");
    const access = await resolveAccessWithStoredFallback(exam, student, req.body.examCode);
    if (!access.allowed) throw forbidden("You are not an allowed Teams member for this exam. Enter the exam code if your teacher gave you one.");

    const deviceFingerprint = buildDeviceFingerprint(req.body, req);
    let session: any = await ExamSession.findOne({ examId: exam._id, studentId: student._id });
    if (session && session.status === "active") {
      if (session.deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
        throw forbidden("Энэ шалгалт өөр төхөөрөмж дээр аль хэдийн идэвхтэй байна. Нэг account нэг дор зөвхөн нэг төхөөрөмж дээр шалгалт өгнө.");
      }
      return res.json({ sessionId: session._id, status: session.status });
    }
    if (session && ["submitted", "banned", "banned_provisional"].includes(session.status) && !canRetake(session)) {
      return res.json({ sessionId: session._id, status: session.status, retakeAllowed: false });
    }

    const { questionOrder, answerMap } = await buildRandomizedExam(req.params.examId);
    session = await ExamSession.findOneAndUpdate(
      { examId: exam._id, studentId: student._id },
      {
        examId: exam._id,
        studentId: student._id,
        status: "active",
        randomizedQuestionOrder: questionOrder,
        randomizedAnswerMap: answerMap,
        currentQuestionIndex: 0,
        currentQuestionDisplayedAt: undefined,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        deviceType: req.body.deviceType || "unknown",
        browser: req.body.browser || "unknown",
        operatingSystem: req.body.operatingSystem || "unknown",
        deviceFingerprint,
        activeDeviceToken: `${student._id}:${Date.now()}`,
        retakeAllowedAt: undefined,
        retakeAllowedByAdminId: undefined,
        retakeReason: "",
        accessMethod: access.method,
        codeAccessGrantedAt: access.method === "code" ? new Date() : undefined
      },
      { upsert: true, new: true }
    );

    req.app.get("io")?.to(`exam:${exam._id}`).emit("student_session_started", { examId: exam._id, sessionId: session._id, studentId: student._id });
    res.json({ sessionId: session._id, status: session.status });
  } catch (err) { next(err); }
}

export async function markQuestionDisplayed(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (session.status !== "active") throw forbidden("Session is not active");
    const questionId = session.randomizedQuestionOrder[Number(session.currentQuestionIndex)];
    const question = questionId ? await Question.findById(questionId) : null;
    if (!question) throw notFound("Question not found");
    if (!session.currentQuestionDisplayedAt) {
      session.currentQuestionDisplayedAt = new Date();
      session.lastActivityAt = new Date();
      await session.save();
    }
    res.json({ displayedAt: session.currentQuestionDisplayedAt, serverNow: new Date(), timeLimitSeconds: question.timeLimitSeconds });
  } catch (err) { next(err); }
}

export async function currentQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (session.status !== "active") return res.json({ status: session.status });
    const payload = await getCurrentQuestionPayload(req.params.sessionId);
    res.json({ ...payload, serverNow: new Date() });
  } catch (err) { next(err); }
}

export async function submitAnswer(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (session.status !== "active") throw forbidden("Session is not active");
    const currentIndex = Number(session.currentQuestionIndex || 0);
    const questionId = session.randomizedQuestionOrder[currentIndex];
    if (!questionId) throw badRequest("No active question");
    if (req.body.questionId && String(req.body.questionId) !== String(questionId)) throw badRequest("Question changed. Refresh current question.");
    if (await Answer.findOne({ examSessionId: session._id, questionId })) {
      return res.json({ status: session.status, duplicate: true, nextQuestion: await safeNextQuestion(session._id.toString()) });
    }
    const question = await Question.findById(questionId);
    if (!question) throw notFound("Question not found");

    const displayedAt: Date = session.currentQuestionDisplayedAt ? new Date(session.currentQuestionDisplayedAt) : new Date();
    const elapsed = elapsedSecondsFrom(displayedAt);
    if (elapsed > Number(question.timeLimitSeconds || 60) + 2) {
      await createAnswerOnce({ examSessionId: session._id, examId: session.examId, studentId: session.studentId, questionId, status: "timeout", isCorrect: false, pointsEarned: 0, startedAt: displayedAt, answeredAt: new Date(), timeSpentSeconds: elapsed });
      const advance = await advanceCurrentQuestion(session);
      return res.json({ status: advance.done ? "submitted" : "active", reason: "timeout", nextQuestion: advance.done ? null : await safeNextQuestion(session._id.toString()) });
    }

    const { isCorrect, pointsEarned } = await gradeAnswer(String(questionId), req.body.answerValue);
    await createAnswerOnce({ examSessionId: session._id, examId: session.examId, studentId: session.studentId, questionId, answerValue: req.body.answerValue, status: isCorrect ? "answered" : "wrong", isCorrect, pointsEarned, startedAt: displayedAt, answeredAt: new Date(), timeSpentSeconds: elapsed });
    const advance = await advanceCurrentQuestion(session);
    res.json({ status: advance.done ? "submitted" : "active", nextQuestion: advance.done ? null : await safeNextQuestion(session._id.toString()) });
  } catch (err) { next(err); }
}

export async function timeoutQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (session.status !== "active") throw forbidden("Session is not active");
    const currentIndex = Number(session.currentQuestionIndex || 0);
    const questionId = session.randomizedQuestionOrder[currentIndex];
    if (!questionId) throw badRequest("No active question");
    if (req.body.questionId && String(req.body.questionId) !== String(questionId)) throw badRequest("Question changed. Refresh current question.");
    if (await Answer.findOne({ examSessionId: session._id, questionId })) {
      return res.json({ status: session.status, duplicate: true, nextQuestion: await safeNextQuestion(session._id.toString()) });
    }
    const displayedAt = session.currentQuestionDisplayedAt || new Date();
    await createAnswerOnce({ examSessionId: session._id, examId: session.examId, studentId: session.studentId, questionId, status: "timeout", isCorrect: false, pointsEarned: 0, startedAt: displayedAt, answeredAt: new Date(), timeSpentSeconds: elapsedSecondsFrom(displayedAt) });
    const advance = await advanceCurrentQuestion(session);
    res.json({ status: advance.done ? "submitted" : "active", nextQuestion: advance.done ? null : await safeNextQuestion(session._id.toString()) });
  } catch (err) { next(err); }
}

export async function submitExam(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (!["submitted", "banned_provisional"].includes(session.status)) {
      session.status = "submitted";
      session.submittedAt = new Date();
      session.lastActivityAt = new Date();
      await session.save();
    }
    const result = await calculateAndSaveResult(session._id.toString(), "submitted");
    res.json({ status: session.status, result: { totalQuestions: result.totalQuestions, correctCount: result.correctCount, rawScore: result.rawScore, rawTotal: result.rawTotal, convertedScore: result.convertedScore, convertedTotal: result.convertedTotal } });
  } catch (err) { next(err); }
}

export async function conclusion(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    const resultStatus = String(session.status).includes("banned") ? "banned_provisional" : "submitted";
    const result = await calculateAndSaveResult(req.params.sessionId, resultStatus);
    res.json({
      message: resultStatus === "banned_provisional" ? "Шалгалт түгжигдсэн. Түр оноо хадгалагдлаа." : "Шалгалт илгээгдлээ.",
      status: result.status,
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      rawScore: result.rawScore,
      rawTotal: result.rawTotal,
      convertedScore: result.convertedScore,
      convertedTotal: result.convertedTotal,
      submittedAt: result.submittedAt
    });
  } catch (err) { next(err); }
}
