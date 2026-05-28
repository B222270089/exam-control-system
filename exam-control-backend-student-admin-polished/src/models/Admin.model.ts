import { Schema, model, InferSchemaType } from "mongoose";

const AdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export type AdminDocument = InferSchemaType<typeof AdminSchema>;
export const Admin = model("Admin", AdminSchema);
