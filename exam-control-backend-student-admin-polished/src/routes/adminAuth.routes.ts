import { Router } from "express";
import { adminLogin, adminLoginSchema, adminMe } from "../controllers/adminAuth.controller";
import { validateRequest } from "../middleware/validateRequest.middleware";
import { requireAdmin } from "../middleware/adminAuth.middleware";

const router = Router();
router.post("/login", validateRequest(adminLoginSchema), adminLogin);
router.get("/me", requireAdmin, adminMe);
export default router;
