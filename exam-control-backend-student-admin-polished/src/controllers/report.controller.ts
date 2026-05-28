import { NextFunction, Request, Response } from "express";
import XLSX from "xlsx";
import { ExamSession } from "../models/ExamSession.model";
import { Student } from "../models/Student.model";
import { Answer } from "../models/Answer.model";
import { Violation } from "../models/Violation.model";
import { Result } from "../models/Result.model";
import { Exam } from "../models/Exam.model";
import { forbidden, notFound } from "../utils/errors";


async function requireOwnedExam(examId: string, adminId?: string) {
  const exam = await Exam.findById(examId);
  if (!exam) throw notFound("Exam not found");
  if (adminId && String(exam.createdByAdminId) !== String(adminId)) throw forbidden("You do not own this exam");
  return exam;
}

export async function liveExam(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const sessions = await ExamSession.find({ examId: req.params.examId }).populate("studentId", "displayName email").sort({ updatedAt: -1 });
    res.json({ sessions });
  } catch (err) { next(err); }
}

export async function examResults(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const results = await Result.find({ examId: req.params.examId }).populate("studentId", "displayName email").sort({ convertedScore: -1 });
    res.json({ results });
  } catch (err) { next(err); }
}

export async function studentReport(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const session = await ExamSession.findOne({ examId: req.params.examId, studentId: req.params.studentId });
    if (!session) throw notFound("Student session not found");
    const [student, answers, violations, result] = await Promise.all([
      Student.findById(req.params.studentId),
      Answer.find({ examSessionId: session._id }).populate("questionId", "text type topic"),
      Violation.find({ examSessionId: session._id }).sort({ timestamp: 1 }),
      Result.findOne({ examSessionId: session._id })
    ]);
    res.json({ student, session, result, answers, violations });
  } catch (err) { next(err); }
}

export async function exportResults(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const results = await Result.find({ examId: req.params.examId }).populate("studentId", "displayName email");
    const rows = results.map((r: any) => ({
      studentName: r.studentId?.displayName || "",
      teamsEmail: r.studentId?.email || "",
      rawScore: r.rawScore,
      rawTotal: r.rawTotal,
      convertedScore: r.convertedScore,
      convertedTotal: r.convertedTotal,
      majorViolations: r.majorViolationCount,
      minorViolations: r.minorViolationCount,
      timeoutCount: r.timeoutCount,
      violationSkippedCount: r.violationSkippedCount,
      status: r.status,
      submittedAt: r.submittedAt
    }));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Results");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=exam-results.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) { next(err); }
}


export async function resetStudentAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const session: any = await ExamSession.findOne({ examId: req.params.examId, studentId: req.params.studentId });
    if (!session) throw notFound("Student session not found");
    await Promise.all([
      Answer.deleteMany({ examSessionId: session._id }),
      Violation.deleteMany({ examSessionId: session._id }),
      Result.deleteMany({ examSessionId: session._id })
    ]);
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
    session.retakeAllowedAt = new Date();
    session.retakeAllowedByAdminId = req.auth?.id;
    session.retakeReason = req.body?.reason || "Admin reset";
    session.lastActivityAt = new Date();
    await session.save();
    res.json({ message: "Student attempt reset. Student can take this exam again.", session });
  } catch (err) { next(err); }
}
