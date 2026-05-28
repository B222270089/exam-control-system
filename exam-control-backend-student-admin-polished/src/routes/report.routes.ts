import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.middleware";
import { examResults, exportResults, liveExam, studentReport, resetStudentAttempt } from "../controllers/report.controller";

const router = Router();
router.use(requireAdmin);
router.get("/exams/:examId/live", liveExam);
router.get("/exams/:examId/results", examResults);
router.get("/exams/:examId/students/:studentId/report", studentReport);
router.post("/exams/:examId/students/:studentId/reset-attempt", resetStudentAttempt);
router.get("/exams/:examId/export-results", exportResults);
export default router;
