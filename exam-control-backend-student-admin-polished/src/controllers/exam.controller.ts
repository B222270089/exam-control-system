import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { env } from "../config/env";
import { Exam } from "../models/Exam.model";
import { TeamsAccessRule } from "../models/TeamsAccessRule.model";
import { badRequest, forbidden, notFound } from "../utils/errors";

function productionDefaultAccessMode() {
  return env.nodeEnv === "development" && env.allowOpenDevAccess ? "open_dev" : "team_member_only";
}

async function generateUniqueExamCode(prefix = "EXAM") {
  for (let i = 0; i < 20; i++) {
    const code = `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const exists = await Exam.exists({ accessCode: code });
    if (!exists) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function requireOwnedExam(examId: string, adminId?: string) {
  const exam = await Exam.findById(examId);
  if (!exam) throw notFound("Exam not found");
  if (adminId && String((exam as any).createdByAdminId) !== String(adminId)) throw forbidden("You can only manage exams you created");
  return exam;
}

export const createExamSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    subject: z.string().optional(),
    description: z.string().optional(),
    totalQuestions: z.number().int().min(1).default(60),
    perQuestionTimeSeconds: z.number().int().min(5).default(60),
    rawTotalScore: z.number().min(1).default(60),
    convertedTotalScore: z.number().min(1).default(30),
    structureMode: z.enum(["all_random", "sectioned_random"]).optional(),
    sections: z.array(z.any()).optional(),
    accessCode: z.string().min(4).optional(),
    allowCodeFallback: z.boolean().optional(),
    requireTeamsForPrimaryAccess: z.boolean().optional(),
    teamsAccess: z.object({
      accessMode: z.enum(["team_member_only", "email_allowlist", "open_dev"]).optional(),
      allowedTenantId: z.string().optional(),
      allowedTeamId: z.string().optional(),
      allowedChannelId: z.string().optional(),
      allowedEmails: z.array(z.string().email()).optional()
    }).optional()
  })
});

const allowedExamUpdateFields = [
  "title", "subject", "description", "totalQuestions", "perQuestionTimeSeconds", "totalTimeSeconds",
  "rawTotalScore", "convertedTotalScore", "accessCode", "allowCodeFallback", "requireTeamsForPrimaryAccess",
  "structureMode", "sections", "randomizeQuestions", "randomizeAnswers", "showOnlyScoreToStudent"
];

function pickAllowedUpdate(body: any) {
  const update: any = {};
  for (const key of allowedExamUpdateFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) update[key] = body[key];
  }
  return update;
}

export async function createExam(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw badRequest("Missing admin auth");
    const submittedCode = String(req.body.accessCode || "").trim();
    const accessCode = submittedCode || await generateUniqueExamCode(String(req.body.subject || "EXAM").slice(0, 6).replace(/\s+/g, "").toUpperCase() || "EXAM");
    if (await Exam.exists({ accessCode })) throw badRequest("Exam access code must be unique");

    const exam = await Exam.create({
      title: req.body.title,
      subject: req.body.subject,
      description: req.body.description,
      totalQuestions: req.body.totalQuestions,
      perQuestionTimeSeconds: req.body.perQuestionTimeSeconds,
      rawTotalScore: req.body.rawTotalScore,
      convertedTotalScore: req.body.convertedTotalScore,
      structureMode: req.body.structureMode,
      sections: req.body.sections,
      createdByAdminId: req.auth.id,
      majorViolationLimit: 3,
      banOnViolationNumber: 4,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showOnlyScoreToStudent: true,
      accessCode,
      allowCodeFallback: req.body.allowCodeFallback !== false,
      requireTeamsForPrimaryAccess: req.body.requireTeamsForPrimaryAccess !== false
    });

    const requestedAccess = req.body.teamsAccess || {};
    const requestedMode = requestedAccess.accessMode || productionDefaultAccessMode();
    const safeMode = requestedMode === "open_dev" && !(env.nodeEnv === "development" && env.allowOpenDevAccess) ? "team_member_only" : requestedMode;
    const access = await TeamsAccessRule.create({
      examId: exam._id,
      accessMode: safeMode,
      allowedTenantId: requestedAccess.allowedTenantId || "",
      allowedTeamId: requestedAccess.allowedTeamId || "",
      allowedChannelId: requestedAccess.allowedChannelId || "",
      allowedEmails: requestedAccess.allowedEmails || []
    });
    (exam as any).teamsAccessRuleId = (access as any)._id;
    await exam.save();
    res.status(201).json({ exam, teamsAccessRule: access });
  } catch (err) { next(err); }
}

export async function listExams(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = req.auth?.id ? { createdByAdminId: req.auth.id } : {};
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json({ exams });
  } catch (err) { next(err); }
}

export async function getExam(req: Request, res: Response, next: NextFunction) {
  try {
    const exam = await requireOwnedExam(req.params.examId, req.auth?.id);
    const accessRule = await TeamsAccessRule.findOne({ examId: exam._id });
    res.json({ exam, accessRule });
  } catch (err) { next(err); }
}

export async function updateExam(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const update = pickAllowedUpdate(req.body);
    if (update.accessCode) {
      const existing = await Exam.findOne({ accessCode: update.accessCode, _id: { $ne: req.params.examId } });
      if (existing) throw badRequest("Exam access code must be unique");
    }
    const exam = await Exam.findByIdAndUpdate(req.params.examId, update, { new: true, runValidators: true });
    if (!exam) throw notFound("Exam not found");
    res.json({ exam });
  } catch (err) { next(err); }
}

export async function setExamStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.params;
    if (!["ready", "open", "closed", "completed"].includes(status)) throw badRequest("Invalid status");
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const update: any = { status };
    if (status === "open") update.openedAt = new Date();
    if (status === "closed") update.closedAt = new Date();
    const exam = await Exam.findByIdAndUpdate(req.params.examId, update, { new: true });
    if (!exam) throw notFound("Exam not found");
    const io = req.app.get("io");
    io?.to(`exam:${exam._id}`).emit("exam_status_changed", { examId: exam._id, status: exam.status });
    res.json({ exam });
  } catch (err) { next(err); }
}

export async function deleteExam(req: Request, res: Response, next: NextFunction) {
  try {
    await requireOwnedExam(req.params.examId, req.auth?.id);
    const exam = await Exam.findByIdAndDelete(req.params.examId);
    if (!exam) throw notFound("Exam not found");
    res.json({ message: "Exam deleted" });
  } catch (err) { next(err); }
}
