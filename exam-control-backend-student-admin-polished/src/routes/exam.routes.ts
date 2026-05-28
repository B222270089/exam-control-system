import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.middleware";
import { createExam, createExamSchema, deleteExam, getExam, listExams, setExamStatus, updateExam } from "../controllers/exam.controller";
import { validateRequest } from "../middleware/validateRequest.middleware";

const router = Router();
router.use(requireAdmin);
router.get("/", listExams);
router.post("/", validateRequest(createExamSchema), createExam);
router.get("/:examId", getExam);
router.patch("/:examId", updateExam);
router.patch("/:examId/status/:status", setExamStatus);
router.delete("/:examId", deleteExam);
export default router;
