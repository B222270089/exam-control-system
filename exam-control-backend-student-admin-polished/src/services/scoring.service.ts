import { Question } from "../models/Question.model";
import { Answer } from "../models/Answer.model";
import { ExamSession } from "../models/ExamSession.model";
import { Exam } from "../models/Exam.model";
import { Result } from "../models/Result.model";
import { convertScore } from "../utils/scoreConverter";

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function gradeAnswer(questionId: string, answerValue: unknown): Promise<{ isCorrect: boolean; pointsEarned: number }> {
  const question = await Question.findById(questionId);
  if (!question) return { isCorrect: false, pointsEarned: 0 };

  let isCorrect = false;
  if (["single_choice", "true_false", "dropdown", "image_question"].includes(question.type)) {
    isCorrect = normalize(answerValue) === normalize(question.correctAnswer);
  } else if (question.type === "multiple_select") {
    const submitted = Array.isArray(answerValue) ? answerValue.map(normalize).sort() : [];
    const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer.map(normalize).sort() : [];
    isCorrect = submitted.length === correct.length && submitted.every((v, i) => v === correct[i]);
  } else if (["fill_blank", "short_answer", "calculation", "code_output"].includes(question.type)) {
    const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
    isCorrect = correctAnswers.some((answer) => normalize(answer) === normalize(answerValue));
  } else if (["matching", "ordering", "image_labeling", "hotspot", "reading", "long_answer"].includes(question.type)) {
    isCorrect = JSON.stringify(answerValue) === JSON.stringify(question.correctAnswer);
  }

  return { isCorrect, pointsEarned: isCorrect ? Number(question.points || 1) : 0 };
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
