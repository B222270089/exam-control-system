import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Question } from "../models/Question.model";
import { Exam } from "../models/Exam.model";
import { forbidden, notFound } from "../utils/errors";
import { recomputeExamTotals } from "../services/examTotals.service";

export const createQuestionSchema = z.object({
  body: z.object({
    sectionKey: z.string().optional(),
    type: z.string(),
    instruction: z.string().optional(),
    text: z.string().min(1),
    mediaUrl: z.string().optional(),
    options: z.array(z.object({ key: z.string(), text: z.string(), isCorrect: z.boolean().optional() })).optional(),
    correctAnswer: z.any().optional(),
    points: z.number().min(0).optional(),
    timeLimitSeconds: z.number().min(5).optional(),
    topic: z.string().optional(),
    difficulty: z.string().optional(),
    inputMode: z.string().optional(),
    structuredData: z.any().optional()
  })
});

const allowedQuestionUpdateFields = ["sectionKey", "type", "instruction", "text", "mediaUrl", "options", "correctAnswer", "points", "timeLimitSeconds", "topic", "difficulty", "inputMode", "structuredData", "isActive"];

function pickAllowedUpdate(body: any) {
  const update: any = {};
  for (const key of allowedQuestionUpdateFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) update[key] = body[key];
  }
  return update;
}

async function requireOwnedExam(examId: string, adminId?: string) {
  const exam = await Exam.findById(examId);
  if (!exam) throw notFound("Exam not found");
  if (adminId && String(exam.createdByAdminId) !== String(adminId)) throw forbidden("You do not own this exam");
  return exam;
}

async function requireOwnedQuestion(questionId: string, adminId?: string) {
  const question = await Question.findById(questionId);
  if (!question) throw notFound("Question not found");
  await requireOwnedExam(String(question.examId), adminId);
  return question;
}

export async function createQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const question = await Question.create({ ...req.body, examId: req.params.examId });
    await recomputeExamTotals(req.params.examId);
    res.status(201).json({ question });
  } catch (err) { next(err); }
}

export async function listQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const questions = await Question.find({ examId: req.params.examId }).sort({ createdAt: 1 });
    res.json({ questions });
  } catch (err) { next(err); }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const owned = await requireOwnedQuestion(req.params.questionId, req.auth?.id);
    const update = pickAllowedUpdate(req.body);
    const question = await Question.findByIdAndUpdate(req.params.questionId, update, { new: true, runValidators: true });
    if (!question) throw notFound("Question not found");
    await recomputeExamTotals(String(owned.examId));
    res.json({ question });
  } catch (err) { next(err); }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const owned = await requireOwnedQuestion(req.params.questionId, req.auth?.id);
    const question = await Question.findByIdAndDelete(req.params.questionId);
    if (!question) throw notFound("Question not found");
    await recomputeExamTotals(String(owned.examId));
    res.json({ message: "Question deleted" });
  } catch (err) { next(err); }
}
