import { Router } from "express";
import { requireStudent } from "../middleware/studentAuth.middleware";
import { majorViolation, minorViolation } from "../controllers/violation.controller";

const router = Router();
router.use(requireStudent);
router.post("/sessions/:sessionId/minor", minorViolation);
router.post("/sessions/:sessionId/major", majorViolation);
export default router;
