import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { forbidden } from "../utils/errors";

export function requireStudent(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw forbidden("Student token required");
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload.role !== "student") throw forbidden("Student access required");
    req.auth = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(forbidden("Student access required"));
  }
}
