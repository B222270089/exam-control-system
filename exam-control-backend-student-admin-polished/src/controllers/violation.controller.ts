import { NextFunction, Request, Response } from "express";
import { Exam } from "../models/Exam.model";
import { ExamSession } from "../models/ExamSession.model";
import { Answer } from "../models/Answer.model";
import { Violation } from "../models/Violation.model";
import { forbidden, notFound } from "../utils/errors";
import { getCurrentQuestionPayload } from "../services/questionPresenter.service";
import { calculateAndSaveResult } from "../services/scoring.service";

const IGNORED_MAJOR_TYPES = new Set(["ORIENTATION_CHANGE", "KEYBOARD_RESIZE", "SHORT_FOCUS_LOSS", "NETWORK_RECONNECT", "WARNING_MODAL_FOCUS"]);

function elapsedSecondsFrom(date?: Date | string | null) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
}

async function safeNextQuestion(sessionId: string) {
  const fresh: any = await ExamSession.findById(sessionId);
  if (!fresh || fresh.status !== "active") return null;
  return getCurrentQuestionPayload(sessionId);
}

async function createAnswerOnce(payload: any) {
  try {
    return await Answer.create(payload);
  } catch (err: any) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

async function advanceAfterViolation(session: any, shouldBan: boolean) {
  const currentIndex = Number(session.currentQuestionIndex || 0);
  const nextIndex = currentIndex + 1;
  const isDone = nextIndex >= (session.randomizedQuestionOrder || []).length;
  const status = shouldBan ? "banned_provisional" : (isDone ? "submitted" : "active");
  const update: any = {
    $set: {
      currentQuestionIndex: nextIndex,
      status,
      lastActivityAt: new Date(),
      ...(shouldBan ? { bannedAt: new Date() } : {}),
      ...(isDone && !shouldBan ? { submittedAt: new Date() } : {})
    },
    $unset: { currentQuestionDisplayedAt: "" }
  };
  const result = await ExamSession.updateOne({ _id: session._id, status: "active", currentQuestionIndex: currentIndex }, update);
  if (result.modifiedCount === 0) return { status: session.status, advanced: false, done: false, banned: false };
  if (shouldBan) {
    await calculateAndSaveResult(session._id.toString(), "banned_provisional");
    return { status: "banned_provisional", advanced: true, done: true, banned: true };
  }
  if (isDone) {
    await calculateAndSaveResult(session._id.toString(), "submitted");
    return { status: "submitted", advanced: true, done: true, banned: false };
  }
  return { status: "active", advanced: true, done: false, banned: false };
}

export async function minorViolation(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    session.minorViolationCount = Number(session.minorViolationCount || 0) + 1;
    session.lastActivityAt = new Date();
    await session.save();
    await Violation.create({
      examSessionId: session._id,
      examId: session.examId,
      studentId: session.studentId,
      questionId: session.randomizedQuestionOrder[session.currentQuestionIndex],
      type: req.body.type || "minor_violation",
      severity: "minor",
      actionTaken: "warning_only",
      details: req.body.details || {}
    });
    res.json({ status: session.status, minorViolationCount: session.minorViolationCount, warningMessage: "Minor violation logged." });
  } catch (err) { next(err); }
}

export async function majorViolation(req: Request, res: Response, next: NextFunction) {
  try {
    const session: any = await ExamSession.findById(req.params.sessionId);
    if (!session) throw notFound("Session not found");
    if (String(session.studentId) !== req.auth?.id) throw forbidden("Wrong session owner");
    if (session.status !== "active") throw forbidden("Session is not active");
    const exam = await Exam.findById(session.examId);
    if (!exam) throw notFound("Exam not found");
    const currentIndex = Number(session.currentQuestionIndex || 0);
    const questionId = session.randomizedQuestionOrder[currentIndex];
    const type = String(req.body.type || "major_violation");
    const hiddenMs = Number(req.body?.details?.hiddenMs || req.body?.details?.durationMs || 0);
    const pageAgeMs = session.startedAt ? Date.now() - new Date(session.startedAt).getTime() : 999999;
    if (IGNORED_MAJOR_TYPES.has(type) || pageAgeMs < 2000) {
      return res.json({ status: session.status, majorViolationCount: session.majorViolationCount, ignored: true, warningMessage: "System/mobile event ignored to avoid false violation." });
    }
    if (hiddenMs > 0 && hiddenMs < 1500) {
      return res.json({ status: session.status, majorViolationCount: session.majorViolationCount, ignored: true, warningMessage: "Very short focus loss ignored to avoid false violation." });
    }
    const lastAt = session.lastMajorViolationAt ? new Date(session.lastMajorViolationAt).getTime() : 0;
    if (lastAt && Date.now() - lastAt < 2500 && session.lastMajorViolationType === type) {
      return res.json({ status: session.status, majorViolationCount: session.majorViolationCount, ignored: true, warningMessage: "Duplicate violation ignored." });
    }

    const nextViolationCount = Number(session.majorViolationCount || 0) + 1;
    const shouldBan = nextViolationCount >= Number(exam.banOnViolationNumber || 4);
    const countUpdate = await ExamSession.updateOne(
      { _id: session._id, status: "active", currentQuestionIndex: currentIndex },
      { $set: { majorViolationCount: nextViolationCount, lastMajorViolationAt: new Date(), lastMajorViolationType: type, lastActivityAt: new Date() } }
    );
    if (countUpdate.modifiedCount === 0) {
      return res.json({ status: session.status, ignored: true, warningMessage: "Duplicate or stale violation ignored." });
    }
    session.majorViolationCount = nextViolationCount;
    session.lastMajorViolationType = type;

    await createAnswerOnce({
      examSessionId: session._id,
      examId: session.examId,
      studentId: session.studentId,
      questionId,
      answerValue: null,
      isCorrect: false,
      pointsEarned: 0,
      status: "skipped_due_to_violation",
      startedAt: session.currentQuestionDisplayedAt,
      answeredAt: new Date(),
      timeSpentSeconds: elapsedSecondsFrom(session.currentQuestionDisplayedAt)
    });

    await Violation.create({
      examSessionId: session._id,
      examId: session.examId,
      studentId: session.studentId,
      questionId,
      type,
      severity: "major",
      actionTaken: shouldBan ? "exam_banned" : "question_skipped",
      details: req.body.details || {}
    });

    const advance = await advanceAfterViolation(session, shouldBan);
    if (advance.banned) {
      const result = await calculateAndSaveResult(session._id.toString(), "banned_provisional");
      return res.json({
        status: "banned_provisional",
        majorViolationCount: nextViolationCount,
        warningMessage: "Таны шалгалт түгжигдлээ. Та зөвшөөрөгдөх хэмжээнээс олон томоохон зөрчил гаргасан байна.",
        result: { rawScore: result.rawScore, rawTotal: result.rawTotal, convertedScore: result.convertedScore, convertedTotal: result.convertedTotal }
      });
    }
    if (advance.done) {
      return res.json({ status: "submitted", majorViolationCount: nextViolationCount, warningMessage: `Анхааруулга ${nextViolationCount}/${exam.majorViolationLimit}. Зөрчлөөс болж асуулт алгассан бөгөөд шалгалт дууслаа.` });
    }
    res.json({
      status: "active",
      majorViolationCount: nextViolationCount,
      warningMessage: `АНХААРУУЛГА ${nextViolationCount}/${exam.majorViolationLimit}. Та шалгалтын орчныг орхисон тул одоогийн асуулт автоматаар алгаслаа.`,
      nextQuestion: await safeNextQuestion(session._id.toString())
    });
  } catch (err) { next(err); }
}
