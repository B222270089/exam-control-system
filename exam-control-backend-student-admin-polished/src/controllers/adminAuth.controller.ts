import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Admin } from "../models/Admin.model";
import { badRequest, forbidden } from "../utils/errors";
import { signToken } from "../utils/jwt";

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: String(email).toLowerCase() });
    if (!admin) throw forbidden("Invalid email or password");
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw forbidden("Invalid email or password");
    admin.lastLoginAt = new Date();
    await admin.save();
    const token = signToken({ sub: admin._id.toString(), role: "admin", email: admin.email });
    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email, role: "admin" } });
  } catch (err) {
    next(err);
  }
}

export async function adminMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw badRequest("Missing auth");
    const admin = await Admin.findById(req.auth.id).select("name email role createdAt");
    if (!admin) throw forbidden("Admin not found");
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}
