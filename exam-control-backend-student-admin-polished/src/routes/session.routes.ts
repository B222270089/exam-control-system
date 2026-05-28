import { Router } from "express";
import { requireStudent } from "../middleware/studentAuth.middleware";
import { acceptRules, accessByCode, accessCheck, conclusion, currentQuestion, deviceCheck, listAvailableExams, markQuestionDisplayed, startExam, submitAnswer, submitExam, timeoutQuestion } from "../controllers/session.controller";

const router = Router();

// PUBLIC: code fallback is used before the student has a token.
router.post("/exams/access-code", accessByCode);

// PROTECTED: all routes below require a student token.
router.use(requireStudent);
router.get("/exams", listAvailableExams);
router.get("/exams/:examId/access-check", accessCheck);
router.post("/exams/:examId/device-check", deviceCheck);
router.post("/exams/:examId/accept-rules", acceptRules);
router.post("/exams/:examId/start", startExam);
router.get("/sessions/:sessionId/current-question", currentQuestion);
router.post("/sessions/:sessionId/question-displayed", markQuestionDisplayed);
router.post("/sessions/:sessionId/answer", submitAnswer);
router.post("/sessions/:sessionId/timeout", timeoutQuestion);
router.post("/sessions/:sessionId/submit", submitExam);
router.get("/sessions/:sessionId/conclusion", conclusion);
export default router;
