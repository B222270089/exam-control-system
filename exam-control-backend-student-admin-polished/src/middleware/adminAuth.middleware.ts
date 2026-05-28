import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { forbidden } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      auth?: { id: string; role: "admin" | "student"; email?: string };
    }
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw forbidden("Admin token required");
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload.role !== "admin") throw forbidden("Admin access required");
    req.auth = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(forbidden("Admin access required"));
  }
}
