import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { Student } from "../models/Student.model";
import { Exam } from "../models/Exam.model";
import { signToken } from "../utils/jwt";
import { forbidden } from "../utils/errors";
import { authenticateTeamsSso } from "../services/microsoftTeamsSso.service";

export const devStudentLoginSchema = z.object({
  body: z.object({
    displayName: z.string().min(1),
    email: z.string().email(),
    microsoftUserId: z.string().optional(),
    tenantId: z.string().optional(),
    teamIds: z.array(z.string()).optional()
  })
});

export async function devStudentLogin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.allowDevStudentLogin) throw forbidden("Development student login is disabled");
    const { displayName, email, microsoftUserId, tenantId, teamIds } = req.body;
    const student = await Student.findOneAndUpdate(
      { microsoftUserId: microsoftUserId || email.toLowerCase() },
      { displayName, email: email.toLowerCase(), microsoftUserId: microsoftUserId || email.toLowerCase(), tenantId: tenantId || "dev", teamIds: teamIds || ["dev-team"], lastLoginAt: new Date() },
      { upsert: true, new: true }
    );
    const token = signToken({ sub: student._id.toString(), role: "student", email: student.email });
    res.json({ token, student });
  } catch (err) { next(err); }
}

export const codeLoginSchema = z.object({
  body: z.object({
    code: z.string().min(4),
    displayName: z.string().min(1).default("Code Access Student"),
    email: z.string().email().optional()
  })
});

export async function codeStudentLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const code = String(req.body.code || "").trim();
    const exam = await Exam.findOne({ accessCode: code, allowCodeFallback: true, status: { $in: ["ready", "open"] } });
    if (!exam) throw forbidden("Invalid exam code or exam is not available");
    const email = String(req.body.email || `code-${code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@local.exam`).toLowerCase();
    const student = await Student.findOneAndUpdate(
      { microsoftUserId: `code:${email}` },
      { displayName: req.body.displayName || "Code Access Student", email, microsoftUserId: `code:${email}`, tenantId: "code", teamIds: [], lastLoginAt: new Date() },
      { upsert: true, new: true }
    );
    const token = signToken({ sub: student._id.toString(), role: "student", email: student.email });
    res.json({ token, student, exam: { id: exam._id, _id: exam._id, title: exam.title, status: exam.status }, code });
  } catch (err) { next(err); }
}

export async function studentMe(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await Student.findById(req.auth?.id);
    if (!student) throw forbidden("Student not found");
    res.json({ student });
  } catch (err) { next(err); }
}

export const teamsSsoSchema = z.object({
  body: z.object({
    teamsSsoToken: z.string().min(20)
  })
});

export async function teamsSsoLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await authenticateTeamsSso(req.body.teamsSsoToken);
    const student = await Student.findOneAndUpdate(
      { microsoftUserId: profile.microsoftUserId },
      {
        displayName: profile.displayName,
        email: profile.email,
        microsoftUserId: profile.microsoftUserId,
        tenantId: profile.tenantId,
        teamIds: profile.teamIds,
        lastLoginAt: new Date()
      },
      { upsert: true, new: true }
    );
    const token = signToken({ sub: student._id.toString(), role: "student", email: student.email });
    res.json({ token, student, teams: profile.graphTeams });
  } catch (err) { next(err); }
}
