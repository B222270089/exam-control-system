import { Schema, model, Types, InferSchemaType } from "mongoose";

const AnswerSchema = new Schema(
  {
    examSessionId: { type: Types.ObjectId, ref: "ExamSession", required: true, index: true },
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    questionId: { type: Types.ObjectId, ref: "Question", required: true, index: true },
    answerValue: { type: Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    status: { type: String, enum: ["answered", "wrong", "timeout", "skipped_due_to_violation", "unanswered"], required: true },
    startedAt: { type: Date },
    answeredAt: { type: Date, default: Date.now },
    timeSpentSeconds: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AnswerSchema.index({ examSessionId: 1, questionId: 1 }, { unique: true });
export type AnswerDocument = InferSchemaType<typeof AnswerSchema>;
export const Answer = model("Answer", AnswerSchema);
