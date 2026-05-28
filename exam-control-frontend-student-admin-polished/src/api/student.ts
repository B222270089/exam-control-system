import { api } from "./client";
import type { CurrentQuestionPayload, ResultSummary, StudentExamCard } from "../types";

export async function devStudentLogin(displayName: string, email: string) {
  const { data } = await api.post("/student/auth/dev-login", {
    displayName,
    email,
    microsoftUserId: email.toLowerCase(),
    tenantId: "dev",
    teamIds: ["dev-team"]
  });
  localStorage.setItem("studentToken", data.token);
  localStorage.removeItem("adminToken");
  return data;
}

export async function teamsSsoLogin(teamsSsoToken: string) {
  const { data } = await api.post("/student/auth/teams/sso", { teamsSsoToken });
  localStorage.setItem("studentToken", data.token);
  localStorage.removeItem("adminToken");
  return data;
}

export async function codeStudentLogin(code: string, studentName?: string, studentCode?: string) {
  const { data } = await api.post("/student/exams/access-code", {
    code,
    studentName,
    studentCode
  });

  if (data.token) {
    localStorage.setItem("studentToken", data.token);
  }

  localStorage.removeItem("adminToken");

  if (data.student) {
    localStorage.setItem("student", JSON.stringify(data.student));
  }

  if (data.exam?.id || data.exam?._id) {
    localStorage.setItem(`examCode:${data.exam.id || data.exam._id}`, code);
  }

  return data;
}

export async function accessExamByCode(code: string) {
  const { data } = await api.post("/student/exams/access-code", { code });
  if (data.token) localStorage.setItem("studentToken", data.token);
  localStorage.removeItem("adminToken");
  if (data.exam?.id || data.exam?._id) localStorage.setItem(`examCode:${data.exam.id || data.exam._id}`, code);
  return data;
}

export async function listAvailableExams(): Promise<StudentExamCard[]> {
  const { data } = await api.get("/student/exams");
  return data.exams;
}

export async function accessCheck(examId: string, code?: string) {
  const query = code ? `?code=${encodeURIComponent(code)}` : "";
  const { data } = await api.get(`/student/exams/${examId}/access-check${query}`);
  return data;
}

export async function deviceCheck(examId: string, payload: any) {
  const { data } = await api.post(`/student/exams/${examId}/device-check`, payload);
  return data;
}

export async function acceptRules(examId: string) {
  const examCode = localStorage.getItem(`examCode:${examId}`) || undefined;
  const { data } = await api.post(`/student/exams/${examId}/accept-rules`, { examCode });
  return data;
}

export async function startExam(examId: string, device: any) {
  const examCode = localStorage.getItem(`examCode:${examId}`) || device.examCode || undefined;
  const { data } = await api.post(`/student/exams/${examId}/start`, { ...device, examCode });
  return data;
}

export async function getCurrentQuestion(sessionId: string): Promise<CurrentQuestionPayload> {
  const { data } = await api.get(`/student/sessions/${sessionId}/current-question`);
  return data;
}

export async function markQuestionDisplayed(sessionId: string) {
  const { data } = await api.post(`/student/sessions/${sessionId}/question-displayed`, {});
  return data;
}

export async function submitAnswer(sessionId: string, answerValue: any, questionId?: string, questionIndex?: number) {
  const { data } = await api.post(`/student/sessions/${sessionId}/answer`, { answerValue, questionId, questionIndex });
  return data;
}

export async function timeoutQuestion(sessionId: string, questionId?: string, questionIndex?: number) {
  const { data } = await api.post(`/student/sessions/${sessionId}/timeout`, { questionId, questionIndex });
  return data;
}

export async function minorViolation(sessionId: string, type: string, details: any = {}) {
  const { data } = await api.post(`/student/violations/sessions/${sessionId}/minor`, { type, details });
  return data;
}

export async function majorViolation(sessionId: string, type: string, details: any = {}) {
  const { data } = await api.post(`/student/violations/sessions/${sessionId}/major`, { type, details });
  return data;
}

export async function getConclusion(sessionId: string): Promise<ResultSummary> {
  const { data } = await api.get(`/student/sessions/${sessionId}/conclusion`);
  return data;
}
