import { Schema, model, Types, InferSchemaType } from "mongoose";

const RandomizedAnswerMapSchema = new Schema(
  {
    questionId: { type: Types.ObjectId, ref: "Question", required: true },
    optionOrder: [{ type: Types.ObjectId }],
    structuredOrder: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const ExamSessionSchema = new Schema(
  {
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    status: { type: String, enum: ["waiting", "active", "submitted", "banned", "banned_provisional"], default: "waiting", index: true },
    deviceType: { type: String, default: "unknown" },
    browser: { type: String, default: "unknown" },
    operatingSystem: { type: String, default: "unknown" },
    deviceFingerprint: { type: String, default: "" },
    activeDeviceToken: { type: String, default: "" },
    retakeAllowedAt: { type: Date },
    retakeAllowedByAdminId: { type: Types.ObjectId, ref: "Admin" },
    retakeReason: { type: String, default: "" },
    randomizedQuestionOrder: [{ type: Types.ObjectId, ref: "Question" }],
    randomizedAnswerMap: { type: [RandomizedAnswerMapSchema], default: [] },
    currentQuestionIndex: { type: Number, default: 0 },
    currentQuestionDisplayedAt: { type: Date },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    bannedAt: { type: Date },
    majorViolationCount: { type: Number, default: 0 },
    minorViolationCount: { type: Number, default: 0 },
    rulesAcceptedAt: { type: Date },
    accessMethod: { type: String, enum: ["teams", "code", "dev", "unknown"], default: "unknown" },
    codeAccessGrantedAt: { type: Date },
    lastMajorViolationAt: { type: Date },
    lastMajorViolationType: { type: String, default: "" },
    lastActivityAt: { type: Date }
  },
  { timestamps: true }
);

ExamSessionSchema.index({ examId: 1, studentId: 1 }, { unique: true });
export type ExamSessionDocument = InferSchemaType<typeof ExamSessionSchema>;
export const ExamSession = model("ExamSession", ExamSessionSchema);
