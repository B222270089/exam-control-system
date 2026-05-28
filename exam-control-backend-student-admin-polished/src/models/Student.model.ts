import { Schema, model, InferSchemaType } from "mongoose";

const StudentSchema = new Schema(
  {
    microsoftUserId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tenantId: { type: String, default: "dev" },
    teamIds: [{ type: String }],
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export type StudentDocument = InferSchemaType<typeof StudentSchema>;
export const Student = model("Student", StudentSchema);
