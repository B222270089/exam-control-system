import { Schema, model, Types, InferSchemaType } from "mongoose";

const ViolationSchema = new Schema(
  {
    examSessionId: { type: Types.ObjectId, ref: "ExamSession", required: true, index: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    questionId: { type: Types.ObjectId, ref: "Question" },
    type: { type: String, required: true },
    severity: { type: String, enum: ["minor", "major"], required: true },
    actionTaken: { type: String, enum: ["warning_only", "question_skipped", "exam_banned"], required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export type ViolationDocument = InferSchemaType<typeof ViolationSchema>;
export const Violation = model("Violation", ViolationSchema);
