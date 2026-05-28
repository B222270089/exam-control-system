import { Exam } from "../models/Exam.model";
import { Question } from "../models/Question.model";

export async function recomputeExamTotals(examId: string) {
  const questions = await Question.find({ examId, isActive: true }).select("points");
  const rawTotalScore = questions.reduce((sum, question: any) => sum + Number(question.points || 1), 0);
  const totalQuestions = questions.length;
  await Exam.findByIdAndUpdate(examId, {
    totalQuestions: Math.max(1, totalQuestions),
    rawTotalScore: Math.max(1, rawTotalScore || totalQuestions || 1)
  });
}
