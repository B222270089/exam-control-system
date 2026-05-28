import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.middleware";
import { createQuestion, createQuestionSchema, deleteQuestion, listQuestions, updateQuestion } from "../controllers/question.controller";
import { validateRequest } from "../middleware/validateRequest.middleware";

const router = Router();
router.use(requireAdmin);
router.post("/exams/:examId/questions", validateRequest(createQuestionSchema), createQuestion);
router.get("/exams/:examId/questions", listQuestions);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);
export default router;
