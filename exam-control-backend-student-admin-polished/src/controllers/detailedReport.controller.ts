import { Request, Response, NextFunction } from "express";
import { ExamSession } from "../models/ExamSession.model";
import { Question } from "../models/Question.model";
import { getReadableCorrectAnswer, getReadableStudentAnswer, isAnswerCorrect } from "../utils/answerCheck";

function getQuestionIdFromAnswer(answer: any) {
  return String(answer?.questionId || answer?.question || answer?._id || "");
}

function getSubmittedAnswer(answer: any) {
  return answer?.answer ?? answer?.submittedAnswer ?? answer?.selectedAnswer ?? answer?.value ?? answer?.response ?? "";
}

export async function detailedExamReport(req: Request, res: Response, next: NextFunction) {
  try {
    const examId = req.params.examId;

    const sessions = await ExamSession.find({ examId })
      .populate("studentId", "displayName email studentCode accessMethod")
      .sort({ updatedAt: -1 })
      .lean();

    const questions = await Question.find({ examId }).lean();
    const questionMap = new Map(questions.map((q: any) => [String(q._id), q]));

    const detailed = sessions.map((session: any) => {
      const answers = Array.isArray(session.answers) ? session.answers : [];

      const answerDetails = answers.map((answer: any, index: number) => {
        const questionId = getQuestionIdFromAnswer(answer);
        const question = questionMap.get(questionId);
        const submittedAnswer = getSubmittedAnswer(answer);

        const correct = question ? isAnswerCorrect(question, submittedAnswer) : Boolean(answer?.isCorrect);

        return {
          number: index + 1,
          questionId,
          questionText: question?.text || question?.question || question?.title || "",
          studentAnswer: getReadableStudentAnswer(submittedAnswer),
          correctAnswer: question ? getReadableCorrectAnswer(question) : "",
          isCorrect: correct,
          score: correct ? 1 : 0,
          savedIsCorrect: answer?.isCorrect,
          answeredAt: answer?.answeredAt || answer?.createdAt || null
        };
      });

      const correctCount = answerDetails.filter((item: any) => item.isCorrect).length;
      const totalQuestions = questions.length || session.totalQuestions || answerDetails.length;
      const rawScore = correctCount;
      const convertedScore = totalQuestions > 0 ? Number(((rawScore / totalQuestions) * 30).toFixed(2)) : 0;

      return {
        sessionId: session._id,
        student: {
          id: session.studentId?._id,
          name: session.studentId?.displayName || "Unknown",
          email: session.studentId?.email || "",
          studentCode: session.studentId?.studentCode || "",
          accessMethod: session.studentId?.accessMethod || session.accessMethod || ""
        },
        status: session.status,
        correctCount,
        totalQuestions,
        rawScore,
        convertedScore,
        majorViolations: session.majorViolations || session.majorViolationCount || 0,
        minorViolations: session.minorViolations || session.minorViolationCount || 0,
        submittedAt: session.submittedAt || session.updatedAt,
        answers: answerDetails
      };
    });

    res.json({ sessions: detailed });
  } catch (err) {
    next(err);
  }
}
