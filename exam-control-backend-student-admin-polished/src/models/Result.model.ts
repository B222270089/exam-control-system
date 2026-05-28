import { Schema, model, Types, InferSchemaType } from "mongoose";

const ResultSchema = new Schema(
  {
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    examSessionId: { type: Types.ObjectId, ref: "ExamSession", required: true, unique: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    rawScore: { type: Number, default: 0 },
    rawTotal: { type: Number, required: true },
    convertedScore: { type: Number, default: 0 },
    convertedTotal: { type: Number, default: 30 },
    timeoutCount: { type: Number, default: 0 },
    violationSkippedCount: { type: Number, default: 0 },
    majorViolationCount: { type: Number, default: 0 },
    minorViolationCount: { type: Number, default: 0 },
    status: { type: String, enum: ["submitted", "banned_provisional"], required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export type ResultDocument = InferSchemaType<typeof ResultSchema>;
export const Result = model("Result", ResultSchema);
