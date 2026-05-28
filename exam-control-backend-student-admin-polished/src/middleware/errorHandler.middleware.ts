import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const error = err as AppError;
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || "Internal server error",
    ...(env.nodeEnv === "development" ? { stack: error.stack } : {})
  });
}
