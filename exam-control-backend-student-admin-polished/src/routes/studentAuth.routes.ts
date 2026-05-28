import { Router } from "express";
import { codeLoginSchema, codeStudentLogin, devStudentLogin, devStudentLoginSchema, studentMe, teamsSsoLogin, teamsSsoSchema } from "../controllers/studentAuth.controller";
import { validateRequest } from "../middleware/validateRequest.middleware";
import { requireStudent } from "../middleware/studentAuth.middleware";

const router = Router();
router.post("/dev-login", validateRequest(devStudentLoginSchema), devStudentLogin);
router.post("/code-login", validateRequest(codeLoginSchema), codeStudentLogin);
router.post("/teams/sso", validateRequest(teamsSsoSchema), teamsSsoLogin);
router.get("/me", requireStudent, studentMe);
export default router;
