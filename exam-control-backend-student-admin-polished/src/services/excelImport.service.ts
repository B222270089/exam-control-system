import XLSX from "xlsx";
import { Question } from "../models/Question.model";
import { recomputeExamTotals } from "./examTotals.service";

type Row = Record<string, any>;

const SUPPORTED_TYPES = new Set([
  "single_choice",
  "multiple_select",
  "true_false",
  "fill_blank",
  "short_answer",
  "long_answer",
  "matching",
  "ordering",
  "dropdown",
  "image_question",
  "image_labeling",
  "hotspot",
  "reading",
  "calculation",
  "code_output"
]);

function clean(row: Row, key: string) {
  return String(row[key] ?? "").trim();
}

function normalizeType(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return "single_choice";
  const aliases: Record<string, string> = {
    mcq: "single_choice",
    multiple_choice: "single_choice",
    single: "single_choice",
    multiple: "multiple_select",
    multi: "multiple_select",
    truefalse: "true_false",
    tf: "true_false",
    fill: "fill_blank",
    blank: "fill_blank",
    short: "short_answer",
    image: "image_question"
  };
  return aliases[value] || value;
}

function inferInputMode(type: string) {
  if (["fill_blank", "short_answer", "calculation", "code_output"].includes(type)) return "limited_keyboard";
  if (["long_answer", "reading"].includes(type)) return "writing";
  return "mouse_only";
}

export function parseExcelQuestions(examId: string, filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName]);
  const valid: any[] = [];
  const invalidRows: { row: number; reason: string; data: Row }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const type = normalizeType(clean(row, "questionType"));
    const text = clean(row, "questionText") || clean(row, "text") || clean(row, "question");

    if (!SUPPORTED_TYPES.has(type)) {
      invalidRows.push({ row: rowNumber, reason: `Unsupported questionType: ${type}`, data: row });
      return;
    }
    if (!text) {
      invalidRows.push({ row: rowNumber, reason: "questionText is required", data: row });
      return;
    }

    const correctAnswer = clean(row, "correctAnswer") || clean(row, "answer");
    const optionLetters = ["A", "B", "C", "D", "E", "F"];
    const correctTokens = correctAnswer.split(",").map(v => v.trim()).filter(Boolean);
    const options = optionLetters
      .map(letter => ({
        key: letter,
        text: clean(row, `option${letter}`),
        isCorrect: false
      }))
      .filter(option => option.text);

    options.forEach(option => {
      option.isCorrect = correctTokens.includes(option.key) || correctTokens.includes(option.text) || correctAnswer === option.text;
    });

    if (["single_choice", "multiple_select", "image_question", "dropdown"].includes(type) && options.length < 2) {
      invalidRows.push({ row: rowNumber, reason: "At least two options are required for this question type", data: row });
      return;
    }
    if (["single_choice", "multiple_select", "true_false", "dropdown", "fill_blank", "short_answer"].includes(type) && !correctAnswer) {
      invalidRows.push({ row: rowNumber, reason: "correctAnswer is required", data: row });
      return;
    }

    const points = Number(row.points || 1);
    const timeLimitSeconds = Number(row.timeLimitSeconds || row.time || 60);

    valid.push({
      examId,
      type,
      instruction: clean(row, "instruction") || (type === "single_choice" ? "Зөв хариултыг сонгоно уу." : "Даалгаврыг гүйцэтгэнэ үү."),
      text,
      mediaUrl: clean(row, "imageUrl") || clean(row, "mediaUrl"),
      options: type === "true_false" && options.length === 0 ? [
        { key: "A", text: "Үнэн", isCorrect: ["A", "true", "үнэн", "yes"].includes(correctAnswer.toLowerCase()) },
        { key: "B", text: "Худал", isCorrect: ["B", "false", "худал", "no"].includes(correctAnswer.toLowerCase()) }
      ] : options,
      correctAnswer: type === "multiple_select" ? correctTokens : correctAnswer,
      points: Number.isFinite(points) && points >= 0 ? points : 1,
      timeLimitSeconds: Number.isFinite(timeLimitSeconds) && timeLimitSeconds >= 5 ? timeLimitSeconds : 60,
      topic: clean(row, "topic"),
      difficulty: clean(row, "difficulty"),
      sectionKey: clean(row, "sectionKey") || "default",
      inputMode: clean(row, "inputMode") || inferInputMode(type),
      structuredData: {}
    });
  });

  return { previewQuestions: valid, invalidRows, totalRows: rows.length };
}

export async function importQuestionsFromExcel(examId: string, filePath: string) {
  const parsed = parseExcelQuestions(examId, filePath);
  const inserted = parsed.previewQuestions.length ? await Question.insertMany(parsed.previewQuestions) : [];
  if (inserted.length) await recomputeExamTotals(examId);
  return { insertedCount: inserted.length, questions: inserted, invalidRows: parsed.invalidRows, totalRows: parsed.totalRows };
}

export async function confirmParsedQuestions(examId: string, questions: any[]) {
  const sanitized = questions
    .filter(q => q?.text && q?.type)
    .map(q => ({
      ...q,
      examId,
      points: Number(q.points || 1),
      timeLimitSeconds: Number(q.timeLimitSeconds || 60),
      sectionKey: q.sectionKey || "default",
      inputMode: q.inputMode || inferInputMode(q.type)
    }));
  const inserted = sanitized.length ? await Question.insertMany(sanitized) : [];
  if (inserted.length) await recomputeExamTotals(examId);
  return { insertedCount: inserted.length, questions: inserted };
}
