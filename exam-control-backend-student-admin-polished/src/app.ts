import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler.middleware";
import adminAuthRoutes from "./routes/adminAuth.routes";
import studentAuthRoutes from "./routes/studentAuth.routes";
import examRoutes from "./routes/exam.routes";
import questionRoutes from "./routes/question.routes";
import uploadRoutes from "./routes/upload.routes";
import sessionRoutes from "./routes/session.routes";
import violationRoutes from "./routes/violation.routes";
import reportRoutes from "./routes/report.routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }));
  app.use("/uploads", express.static(env.uploadDir));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "exam-control-backend" }));
  app.use("/api/admin/auth", adminAuthRoutes);
  app.use("/api/student/auth", studentAuthRoutes);
  app.use("/api/admin/exams", examRoutes);
  app.use("/api/admin", questionRoutes);
  app.use("/api/admin", uploadRoutes);
  app.use("/api/student", sessionRoutes);
  app.use("/api/student/violations", violationRoutes);
  app.use("/api/admin", reportRoutes);

  app.use(errorHandler);
  return app;
}
