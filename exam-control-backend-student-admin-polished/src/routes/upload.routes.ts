import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { requireAdmin } from "../middleware/adminAuth.middleware";
import { confirmExcelImport, confirmPastedTextImport, importExcel, previewExcel, previewPastedText } from "../controllers/upload.controller";

const upload = multer({
  dest: env.uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    if (!ok) return cb(null, false);
    return cb(null, true);
  }
});
const router = Router();
router.use(requireAdmin);
router.post("/exams/:examId/questions/parse-text-preview", previewPastedText);
router.post("/exams/:examId/questions/parse-text-confirm", confirmPastedTextImport);
router.post("/exams/:examId/questions/import-excel-preview", upload.single("file"), previewExcel);
router.post("/exams/:examId/questions/import-excel-confirm", confirmExcelImport);
router.post("/exams/:examId/questions/import-excel", upload.single("file"), importExcel);
export default router;
