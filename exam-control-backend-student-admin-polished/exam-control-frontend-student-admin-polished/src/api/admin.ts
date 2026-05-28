import { api } from "./client";
import type { Exam, Question } from "../types";

export async function adminLogin(email: string, password: string) {
  const { data } = await api.post("/admin/auth/login", { email, password });
  localStorage.setItem("adminToken", data.token);
  localStorage.removeItem("studentToken");
  return data;
}

export async function getAdminMe() {
  const { data } = await api.get("/admin/auth/me");
  return data;
}

export async function listExams(): Promise<Exam[]> {
  const { data } = await api.get("/admin/exams");
  return data.exams;
}

export async function getExam(examId: string): Promise<{ exam: Exam; accessRule?: any }> {
  const { data } = await api.get(`/admin/exams/${examId}`);
  return data;
}

export async function createExam(payload: Partial<Exam> & { teamsAccess?: any }) {
  const { data } = await api.post("/admin/exams", payload);
  return data;
}

export async function updateExam(examId: string, payload: Partial<Exam>) {
  const { data } = await api.patch(`/admin/exams/${examId}`, payload);
  return data.exam as Exam;
}

export async function updateExamStatus(examId: string, status: string) {
  const { data } = await api.patch(`/admin/exams/${examId}/status/${status}`);
  return data.exam as Exam;
}

export async function listQuestions(examId: string): Promise<Question[]> {
  const { data } = await api.get(`/admin/exams/${examId}/questions`);
  return data.questions;
}

export async function createQuestion(examId: string, payload: Partial<Question>) {
  const { data } = await api.post(`/admin/exams/${examId}/questions`, payload);
  return data.question as Question;
}

export async function updateQuestion(questionId: string, payload: Partial<Question>) {
  const { data } = await api.patch(`/admin/questions/${questionId}`, payload);
  return data.question as Question;
}

export async function deleteQuestion(questionId: string) {
  const { data } = await api.delete(`/admin/questions/${questionId}`);
  return data;
}

export async function importQuestionsExcel(examId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/admin/exams/${examId}/questions/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function previewQuestionsExcel(examId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/admin/exams/${examId}/questions/import-excel-preview`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data as { previewQuestions: Question[]; invalidRows: any[]; totalRows: number };
}

export async function confirmQuestionsExcel(examId: string, questions: Partial<Question>[]) {
  const { data } = await api.post(`/admin/exams/${examId}/questions/import-excel-confirm`, { questions });
  return data;
}

export async function confirmPastedQuestions(examId: string, questions: Partial<Question>[]) {
  const { data } = await api.post(`/admin/exams/${examId}/questions/parse-text-confirm`, { questions });
  return data;
}

export async function previewPastedQuestions(examId: string, content: string) {
  const { data } = await api.post(`/admin/exams/${examId}/questions/parse-text-preview`, { content });
  return data as { previewQuestions: Question[]; invalidRows: any[]; totalRows: number };
}

export async function liveExam(examId: string) {
  const { data } = await api.get(`/admin/exams/${examId}/live`);
  return data;
}

export async function examResults(examId: string) {
  const { data } = await api.get(`/admin/exams/${examId}/results`);
  return data;
}

export async function studentReport(examId: string, studentId: string) {
  const { data } = await api.get(`/admin/exams/${examId}/students/${studentId}/report`);
  return data;
}

export function exportResultsUrl(examId: string) {
  return `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/admin/exams/${examId}/export-results`;
}


export async function resetStudentAttempt(examId: string, studentId: string, reason = "Admin reset") {
  const { data } = await api.post(`/admin/exams/${examId}/students/${studentId}/reset-attempt`, { reason });
  return data;
}
