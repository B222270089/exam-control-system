import { env } from "../config/env";
import { TeamsAccessRule } from "../models/TeamsAccessRule.model";

export async function isStudentAllowedForExam(examId: string, student: { email: string; tenantId?: string; teamIds?: string[] }) {
  const rule = await TeamsAccessRule.findOne({ examId });
  if (!rule) return false;
  if (rule.accessMode === "open_dev") return env.nodeEnv === "development" && env.allowOpenDevAccess;
  if (rule.accessMode === "email_allowlist") return rule.allowedEmails.map(e => e.toLowerCase()).includes(student.email.toLowerCase());
  if (rule.accessMode === "team_member_only") {
    if (rule.allowedTenantId && student.tenantId && rule.allowedTenantId !== student.tenantId) return false;
    return !!rule.allowedTeamId && !!student.teamIds?.includes(rule.allowedTeamId);
  }
  return false;
}

export async function resolveExamAccess(exam: any, student: { email: string; tenantId?: string; teamIds?: string[] }, code?: string) {
  const teamsAllowed = await isStudentAllowedForExam(String(exam._id), student);
  if (teamsAllowed) return { allowed: true, method: "teams" };
  const submittedCode = String(code || "").trim();
  if (exam.allowCodeFallback && submittedCode && exam.accessCode && submittedCode === String(exam.accessCode).trim()) {
    return { allowed: true, method: "code" };
  }
  return { allowed: false, method: "unknown" };
}
