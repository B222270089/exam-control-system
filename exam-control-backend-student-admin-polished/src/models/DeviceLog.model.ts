import { Schema, model, Types, InferSchemaType } from "mongoose";

const DeviceLogSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    examSessionId: { type: Types.ObjectId, ref: "ExamSession" },
    deviceType: { type: String, default: "unknown" },
    operatingSystem: { type: String, default: "unknown" },
    browser: { type: String, default: "unknown" },
    screenWidth: { type: Number, default: 0 },
    screenHeight: { type: Number, default: 0 },
    viewportWidth: { type: Number, default: 0 },
    viewportHeight: { type: Number, default: 0 },
    timezone: { type: String, default: "" },
    language: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    isTeamsInAppBrowser: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type DeviceLogDocument = InferSchemaType<typeof DeviceLogSchema>;
export const DeviceLog = model("DeviceLog", DeviceLogSchema);
