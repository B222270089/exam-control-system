import { Question } from "../models/Question.model";
import { Answer } from "../models/Answer.model";
import { ExamSession } from "../models/ExamSession.model";
import { Exam } from "../models/Exam.model";
import { Result } from "../models/Result.model";
import { convertScore } from "../utils/scoreConverter";
import { isAnswerCorrect } from "../utils/answerCheck";

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function gradeAnswer(questionId: string, answerValue: any) {
  const question = await Question.findById(questionId).lean();

  if (!question) {
    return {
      isCorrect: false,
      pointsEarned: 0
    };
  }

  const isCorrect = isAnswerCorrect(question, answerValue);
  const points = Number((question as any).points || (question as any).score || 1);

  return {
    isCorrect,
    pointsEarned: isCorrect ? points : 0
  };
}

async function ensureMissingAnswerRecords(session: any) {
  const questionIds = (session.randomizedQuestionOrder || []).map((id: any) => String(id));
  if (!questionIds.length) return;
  const existing = await Answer.find({ examSessionId: session._id }).select("questionId");
  const existingSet = new Set(existing.map((answer: any) => String(answer.questionId)));
  const missing = questionIds.filter((id: string) => !existingSet.has(id));
  if (!missing.length) return;
  await Answer.insertMany(missing.map((questionId: string) => ({
    examSessionId: session._id,
    examId: session.examId,
    studentId: session.studentId,
    questionId,
    answerValue: null,
    isCorrect: false,
    pointsEarned: 0,
    status: "unanswered",
    answeredAt: new Date(),
    timeSpentSeconds: 0
  })), { ordered: false });
}

export async function calculateAndSaveResult(sessionId: string, status: "submitted" | "banned_provisional") {
  const session = await ExamSession.findById(sessionId);
  if (!session) throw new Error("Session not found");
  const exam = await Exam.findById(session.examId);
  if (!exam) throw new Error("Exam not found");
  await ensureMissingAnswerRecords(session);
  const answers = await Answer.find({ examSessionId: session._id });

  const rawScore = answers.reduce((sum, a) => sum + Number(a.pointsEarned || 0), 0);
  const correctCount = answers.filter(a => a.isCorrect).length;
  const timeoutCount = answers.filter(a => a.status === "timeout").length;
  const violationSkippedCount = answers.filter(a => a.status === "skipped_due_to_violation").length;
  const selectedQuestions = await Question.find({ _id: { $in: session.randomizedQuestionOrder || [] } }).select("points");
  const questionPointTotal = selectedQuestions.reduce((sum, q: any) => sum + Number(q.points || 1), 0);
  const rawTotal = questionPointTotal > 0 ? questionPointTotal : Number(exam.rawTotalScore || exam.totalQuestions || 1);
  const convertedTotal = Number(exam.convertedTotalScore || 30);
  const convertedScore = convertScore(rawScore, rawTotal, convertedTotal);

  const result = await Result.findOneAndUpdate(
    { examSessionId: session._id },
    {
      examId: session.examId,
      studentId: session.studentId,
      examSessionId: session._id,
      totalQuestions: session.randomizedQuestionOrder.length || exam.totalQuestions,
      correctCount,
      rawScore,
      rawTotal,
      convertedScore,
      convertedTotal,
      timeoutCount,
      violationSkippedCount,
      majorViolationCount: session.majorViolationCount,
      minorViolationCount: session.minorViolationCount,
      status,
      submittedAt: new Date()
    },
    { upsert: true, new: true }
  );
  return result;
}
