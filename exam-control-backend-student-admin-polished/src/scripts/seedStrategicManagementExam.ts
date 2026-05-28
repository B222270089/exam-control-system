import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { Admin } from "../models/Admin.model";
import { Exam } from "../models/Exam.model";
import { Question } from "../models/Question.model";
import { TeamsAccessRule } from "../models/TeamsAccessRule.model";
import { recomputeExamTotals } from "../services/examTotals.service";
import { strategicManagementQuestions } from "../data/strategicManagementQuestions";

async function seed() {
  await connectDatabase();
  const admin = await Admin.findOne({ email: env.adminSeedEmail.toLowerCase() });
  if (!admin) {
    throw new Error(`Admin not found. Run npm run seed:admin first. Missing: ${env.adminSeedEmail}`);
  }

  const accessCode = "CODE-60";
  let exam: any = await Exam.findOne({ accessCode });
  if (!exam) {
    exam = await Exam.create({
      title: "Стратегийн менежмент — 60 сонголттой дасгал",
      subject: "Стратегийн менежмент",
      description: "Лекц 1–5 дээр суурилсан 60 асуулттай шалгалт. Сурагч зөвхөн оноо, зөв хариултын тоо болон 30 оноонд шилжүүлсэн дүнгээ харна.",
      status: "ready",
      totalQuestions: 60,
      perQuestionTimeSeconds: 60,
      rawTotalScore: 60,
      convertedTotalScore: 30,
      majorViolationLimit: 3,
      banOnViolationNumber: 4,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showOnlyScoreToStudent: true,
      accessCode,
      allowCodeFallback: true,
      requireTeamsForPrimaryAccess: true,
      structureMode: "sectioned_random",
      sections: [1, 2, 3, 4, 5].map((n) => ({
        key: `лекц_${n}`,
        title: `Лекц ${n}`,
        description: "Стратегийн менежментийн сэдэвчилсэн хэсэг",
        questionCount: 12,
        pointsPerQuestion: 1,
        timeLimitSeconds: 60,
        questionTypes: ["single_choice", "multiple_select", "true_false"],
        shuffleWithinSection: true
      })),
      createdByAdminId: admin._id
    });
  } else {
    exam.set({
      title: "Стратегийн менежмент — 60 сонголттой дасгал",
      subject: "Стратегийн менежмент",
      description: "Лекц 1–5 дээр суурилсан 60 асуулттай шалгалт. Сурагч зөвхөн оноо, зөв хариултын тоо болон 30 оноонд шилжүүлсэн дүнгээ харна.",
      status: exam.status === "open" ? "open" : "ready",
      totalQuestions: 60,
      perQuestionTimeSeconds: 60,
      convertedTotalScore: 30,
      majorViolationLimit: 3,
      banOnViolationNumber: 4,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showOnlyScoreToStudent: true,
      allowCodeFallback: true,
      requireTeamsForPrimaryAccess: true,
      structureMode: "sectioned_random",
      createdByAdminId: admin._id
    });
    await exam.save();
  }

  await Question.deleteMany({ examId: exam._id });
  await Question.insertMany(strategicManagementQuestions.map((question: any) => ({
    examId: exam._id,
    sectionKey: question.sectionKey,
    type: question.type,
    instruction: question.instruction,
    text: question.text,
    options: question.options,
    correctAnswer: question.correctAnswer,
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    topic: question.topic,
    difficulty: question.difficulty,
    inputMode: question.inputMode,
    structuredData: { sourceNumber: question.number }
  })));

  await TeamsAccessRule.findOneAndUpdate(
    { examId: exam._id },
    {
      examId: exam._id,
      accessMode: env.nodeEnv === "development" && env.allowOpenDevAccess ? "open_dev" : "team_member_only",
      allowedTenantId: env.microsoft.tenantId || "",
      allowedTeamId: process.env.MS_ALLOWED_TEAM_ID || "",
      allowedEmails: []
    },
    { upsert: true, new: true }
  );

  await recomputeExamTotals(String(exam._id));
  console.log(`Seeded Strategic Management exam: ${exam.title}`);
  console.log(`Exam ID: ${exam._id}`);
  console.log(`Fallback code: ${accessCode}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
