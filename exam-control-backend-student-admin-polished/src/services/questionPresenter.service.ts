import { ExamSession } from "../models/ExamSession.model";
import { Question } from "../models/Question.model";

export async function getCurrentQuestionPayload(sessionId: string) {
  const session: any = await ExamSession.findById(sessionId);
  if (!session) throw new Error("Session not found");
  const questionId = session.randomizedQuestionOrder[Number(session.currentQuestionIndex)];
  if (!questionId) return null;
  const question = await Question.findById(questionId);
  if (!question) return null;

  const map = session.randomizedAnswerMap.find(item => String(item.questionId) === String(question._id));
  const optionOrder = map?.optionOrder?.map(String) || [];
  const safeOptions = question.options
    .filter(option => optionOrder.length === 0 || optionOrder.includes(String(option._id)))
    .sort((a, b) => optionOrder.indexOf(String(a._id)) - optionOrder.indexOf(String(b._id)))
    .map(option => ({ id: option._id, key: option.key, text: option.text }));

  return {
    sessionId: session._id,
    questionNumber: Number(session.currentQuestionIndex) + 1,
    totalQuestions: session.randomizedQuestionOrder.length,
    majorViolationCount: session.majorViolationCount,
    minorViolationCount: session.minorViolationCount,
    question: {
      id: question._id,
      type: question.type,
      instruction: question.instruction,
      text: question.text,
      mediaUrl: question.mediaUrl,
      options: safeOptions,
      points: question.points,
      timeLimitSeconds: question.timeLimitSeconds,
      inputMode: question.inputMode,
      structuredData: question.structuredData
    },
    displayedAt: session.currentQuestionDisplayedAt,
    status: session.status
  };
}
