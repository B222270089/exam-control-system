import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { confirmParsedQuestions, importQuestionsFromExcel, parseExcelQuestions } from "../services/excelImport.service";
import { Exam } from "../models/Exam.model";
import { forbidden, notFound } from "../utils/errors";
import { confirmParsedTextQuestions, parseTextQuestions } from "../services/textImport.service";


async function requireOwnedExam(examId: string, adminId?: string) {
  const exam = await Exam.findById(examId);
  if (!exam) throw notFound("Exam not found");
  if (adminId && String(exam.createdByAdminId) !== String(adminId)) throw forbidden("You do not own this exam");
  return exam;
}

export async function previewExcel(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    if (!req.file) throw new Error("Excel file is required");
    const result = parseExcelQuestions(req.params.examId, req.file.path);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (err) { next(err); }
}

export async function confirmExcelImport(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    const result = await confirmParsedQuestions(req.params.examId, questions);
    res.json(result);
  } catch (err) { next(err); }
}

export async function importExcel(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    if (!req.file) throw new Error("Excel file is required");
    const result = await importQuestionsFromExcel(req.params.examId, req.file.path);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (err) { next(err); }
}


export async function previewPastedText(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const content = String(req.body.content || "");
    if (!content.trim()) throw new Error("Pasted exam content is required");
    const result = parseTextQuestions(req.params.examId, content);
    res.json(result);
  } catch (err) { next(err); }
}


export async function confirmPastedTextImport(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];
    const result = await confirmParsedTextQuestions(req.params.examId, questions);
    res.json(result);
  } catch (err) { next(err); }
}
