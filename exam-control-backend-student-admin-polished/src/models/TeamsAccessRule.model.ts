import { Schema, model, Types, InferSchemaType } from "mongoose";

const TeamsAccessRuleSchema = new Schema(
  {
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    accessMode: { type: String, enum: ["team_member_only", "email_allowlist", "open_dev"], default: "team_member_only" },
    allowedTenantId: { type: String, default: "" },
    allowedTeamId: { type: String, default: "" },
    allowedChannelId: { type: String, default: "" },
    allowedEmails: [{ type: String, lowercase: true, trim: true }]
  },
  { timestamps: true }
);

export type TeamsAccessRuleDocument = InferSchemaType<typeof TeamsAccessRuleSchema>;
export const TeamsAccessRule = model("TeamsAccessRule", TeamsAccessRuleSchema);
