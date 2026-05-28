import { Schema, model, Types, InferSchemaType } from "mongoose";

const ExamSectionSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    questionCount: { type: Number, min: 0, default: 0 },
    pointsPerQuestion: { type: Number, min: 0, default: 1 },
    timeLimitSeconds: { type: Number, min: 5, default: 60 },
    questionTypes: [{ type: String }],
    shuffleWithinSection: { type: Boolean, default: true }
  },
  { _id: false }
);

const ExamSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, default: "General", trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["draft", "ready", "open", "closed", "completed"], default: "draft", index: true },
    totalQuestions: { type: Number, min: 1, default: 60 },
    perQuestionTimeSeconds: { type: Number, min: 5, default: 60 },
    totalTimeSeconds: { type: Number, min: 0, default: 0 },
    rawTotalScore: { type: Number, min: 1, default: 60 },
    convertedTotalScore: { type: Number, min: 1, default: 30 },
    majorViolationLimit: { type: Number, min: 0, default: 3 },
    banOnViolationNumber: { type: Number, min: 1, default: 4 },
    randomizeQuestions: { type: Boolean, default: true },
    randomizeAnswers: { type: Boolean, default: true },
    showOnlyScoreToStudent: { type: Boolean, default: true },
    accessCode: { type: String, trim: true, unique: true, sparse: true, index: true },
    allowCodeFallback: { type: Boolean, default: true },
    requireTeamsForPrimaryAccess: { type: Boolean, default: true },
    structureMode: { type: String, enum: ["all_random", "sectioned_random"], default: "all_random" },
    sections: { type: [ExamSectionSchema], default: [] },
    createdByAdminId: { type: Types.ObjectId, ref: "Admin", required: true },
    teamsAccessRuleId: { type: Types.ObjectId, ref: "TeamsAccessRule" },
    openedAt: { type: Date },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

export type ExamDocument = InferSchemaType<typeof ExamSchema>;
export const Exam = model("Exam", ExamSchema);
