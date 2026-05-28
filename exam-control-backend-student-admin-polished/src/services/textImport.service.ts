import { Question } from "../models/Question.model";
import { recomputeExamTotals } from "./examTotals.service";

const SUPPORTED_TYPES = new Set([
  "single_choice", "multiple_select", "true_false", "fill_blank", "short_answer", "long_answer",
  "matching", "ordering", "dropdown", "image_question", "image_labeling", "hotspot", "reading", "calculation", "code_output"
]);

function normalizeType(raw = "") {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, string> = {
    mcq: "single_choice",
    multiple_choice: "single_choice",
    single: "single_choice",
    one_choice: "single_choice",
    multiple: "multiple_select",
    multi: "multiple_select",
    truefalse: "true_false",
    tf: "true_false",
    fill: "fill_blank",
    blank: "fill_blank",
    short: "short_answer",
    essay: "long_answer",
    image: "image_question",
    label: "image_labeling"
  };
  return aliases[value] || value || "single_choice";
}

function inferInputMode(type: string) {
  if (["fill_blank", "short_answer", "calculation", "code_output"].includes(type)) return "limited_keyboard";
  if (["long_answer", "reading"].includes(type)) return "writing";
  return "mouse_only";
}

function readField(block: string, keys: string[]) {
  for (const key of keys) {
    const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, "im");
    const match = block.match(re);
    if (match) return match[1].trim();
  }
  return "";
}

function stripFieldLines(block: string) {
  return block
    .split(/\r?\n/)
    .filter(line => !/^\s*(QUESTION\s*\d*|АСУУЛТ\s*\d*)\s*:?\s*$/i.test(line))
    .filter(line => !/^\s*(type|төрөл|time|хугацаа|points|оноо|answer|correct|зөв\s*хариулт|topic|сэдэв|difficulty|түвшин|image|media)\s*:/i.test(line))
    .join("\n")
    .trim();
}

function parseOptions(block: string) {
  const options: { key: string; text: string; isCorrect: boolean }[] = [];
  const optionRegex = /^\s*([A-FАБВГДЕ])\s*[\).:-]\s*(.+)$/gim;
  let match: RegExpExecArray | null;
  while ((match = optionRegex.exec(block))) {
    const rawKey = match[1].toUpperCase();
    const keyMap: Record<string, string> = { "А": "A", "Б": "B", "В": "C", "Г": "D", "Д": "E", "Е": "F" };
    options.push({ key: keyMap[rawKey] || rawKey, text: match[2].trim(), isCorrect: false });
  }
  return options;
}

export function parseTextQuestions(examId: string, content: string) {
  const normalized = String(content || "").replace(/\r\n/g, "\n").trim();
  const blocks = normalized
    .split(/\n\s*(?:---+|###\s*QUESTION|QUESTION\s*\d*|АСУУЛТ\s*\d*)\s*\n/gi)
    .map(b => b.trim())
    .filter(Boolean);
  const sourceBlocks = blocks.length ? blocks : [normalized];
  const previewQuestions: any[] = [];
  const invalidRows: { row: number; reason: string; data: any }[] = [];

  sourceBlocks.slice(0, 300).forEach((block, index) => {
    const type = normalizeType(readField(block, ["type", "төрөл"]));
    if (!SUPPORTED_TYPES.has(type)) {
      invalidRows.push({ row: index + 1, reason: `Unsupported type: ${type}`, data: { block } });
      return;
    }
    const instruction = readField(block, ["instruction", "заавар"]);
    const answer = readField(block, ["answer", "correct", "зөв\\s*хариулт"]);
    const topic = readField(block, ["topic", "сэдэв"]);
    const difficulty = readField(block, ["difficulty", "түвшин"]);
    const mediaUrl = readField(block, ["image", "media"]);
    const pointsRaw = Number(readField(block, ["points", "оноо"]) || 1);
    const timeRaw = Number(readField(block, ["time", "хугацаа"]) || 60);
    const options = parseOptions(block);
    const textLines = stripFieldLines(block)
      .split(/\n/)
      .filter(line => !/^\s*[A-F]\s*[\).:-]\s*/i.test(line))
      .map(line => line.replace(/^\s*text\s*:\s*/i, "").replace(/^\s*асуулт\s*:\s*/i, "").trim())
      .filter(Boolean);
    const text = textLines.join("\n").trim();

    if (!text) {
      invalidRows.push({ row: index + 1, reason: "Question text is required", data: { block } });
      return;
    }
    if (["single_choice", "multiple_select", "dropdown", "image_question"].includes(type) && options.length < 2) {
      invalidRows.push({ row: index + 1, reason: "At least two options are required", data: { block } });
      return;
    }
    if (["single_choice", "multiple_select", "true_false", "dropdown", "fill_blank", "short_answer"].includes(type) && !answer) {
      invalidRows.push({ row: index + 1, reason: "Answer is required", data: { block } });
      return;
    }

    const correctTokens = answer.split(",").map(v => v.trim()).filter(Boolean);
    if (type === "true_false" && options.length === 0) {
      options.push(
        { key: "A", text: "Үнэн", isCorrect: ["a", "true", "үнэн", "yes"].includes(answer.toLowerCase()) },
        { key: "B", text: "Худал", isCorrect: ["b", "false", "худал", "no"].includes(answer.toLowerCase()) }
      );
    } else {
      options.forEach(option => {
        option.isCorrect = correctTokens.includes(option.key) || correctTokens.includes(option.text) || answer === option.text;
      });
    }

    previewQuestions.push({
      examId,
      type,
      instruction: instruction || (type === "single_choice" ? "Зөв хариултыг сонгоно уу." : "Даалгаврыг гүйцэтгэнэ үү."),
      text,
      mediaUrl,
      options,
      correctAnswer: type === "multiple_select" ? correctTokens : answer,
      points: Number.isFinite(pointsRaw) && pointsRaw >= 0 ? pointsRaw : 1,
      timeLimitSeconds: Number.isFinite(timeRaw) && timeRaw >= 5 ? timeRaw : 60,
      topic,
      difficulty,
      sectionKey: "default",
      inputMode: inferInputMode(type),
      structuredData: {}
    });
  });

  return { previewQuestions, invalidRows, totalRows: sourceBlocks.length };
}

export async function confirmParsedTextQuestions(examId: string, questions: any[]) {
  const sanitized = questions.filter(q => q?.text && q?.type).map(q => ({
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
