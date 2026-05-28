import { Types } from "mongoose";
import { Exam } from "../models/Exam.model";
import { Question } from "../models/Question.model";
import { shuffleArray } from "../utils/shuffle";

export async function buildRandomizedExam(examId: string) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new Error("Exam not found");
  const allQuestions = await Question.find({ examId, isActive: true });
  if (allQuestions.length === 0) throw new Error("This exam has no active questions");

  let selected = allQuestions;

  if (exam.structureMode === "sectioned_random" && exam.sections.length > 0) {
    const sectionPicked: typeof allQuestions = [];
    for (const section of exam.sections) {
      const pool = allQuestions.filter(q => q.sectionKey === section.key && (!section.questionTypes?.length || section.questionTypes.includes(q.type)));
      const ordered = section.shuffleWithinSection ? shuffleArray(pool) : pool;
      sectionPicked.push(...ordered.slice(0, section.questionCount || ordered.length));
    }
    selected = sectionPicked.length > 0 ? sectionPicked : allQuestions;
  } else if (exam.totalQuestions > 0) {
    selected = (exam.randomizeQuestions ? shuffleArray(allQuestions) : allQuestions).slice(0, Math.min(exam.totalQuestions, allQuestions.length));
  }

  const questionOrder = exam.randomizeQuestions ? shuffleArray(selected.map(q => q._id as Types.ObjectId)) : selected.map(q => q._id as Types.ObjectId);
  const answerMap = selected.map(q => ({
    questionId: q._id as Types.ObjectId,
    optionOrder: exam.randomizeAnswers && q.options?.length ? shuffleArray(q.options.map(o => o._id as Types.ObjectId)) : q.options.map(o => o._id as Types.ObjectId),
    structuredOrder: q.structuredData || {}
  }));

  return { questionOrder, answerMap };
}
