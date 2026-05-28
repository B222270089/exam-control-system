export function normalizeAnswer(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function addValue(set: Set<string>, value: any) {
  const normalized = normalizeAnswer(value);
  if (normalized) set.add(normalized);
}

function getOptionText(option: any) {
  if (typeof option === "string") return option;
  return option?.text ?? option?.label ?? option?.value ?? option?.title ?? "";
}

function getOptionId(option: any) {
  if (typeof option === "string") return "";
  return option?.id ?? option?._id ?? option?.key ?? option?.value ?? "";
}

export function getCorrectAnswerSet(question: any): Set<string> {
  const correct = new Set<string>();

  addValue(correct, question.correctAnswer);
  addValue(correct, question.answer);
  addValue(correct, question.correctOption);
  addValue(correct, question.correctOptionId);
  addValue(correct, question.correctOptionText);

  if (Array.isArray(question.correctAnswers)) {
    for (const value of question.correctAnswers) addValue(correct, value);
  }

  if (Array.isArray(question.options)) {
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];
      const letter = String.fromCharCode(65 + i);
      const text = getOptionText(option);
      const id = getOptionId(option);

      const markedCorrect =
        option?.isCorrect === true ||
        option?.correct === true ||
        option?.isAnswer === true;

      const correctIndex =
        question.correctIndex === i ||
        question.correctOptionIndex === i ||
        question.answerIndex === i;

      const matchesCorrect =
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(letter) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(i) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(text) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(id) ||
        normalizeAnswer(question.answer) === normalizeAnswer(letter) ||
        normalizeAnswer(question.answer) === normalizeAnswer(i) ||
        normalizeAnswer(question.answer) === normalizeAnswer(text) ||
        normalizeAnswer(question.answer) === normalizeAnswer(id);

      if (markedCorrect || correctIndex || matchesCorrect) {
        addValue(correct, letter);
        addValue(correct, i);
        addValue(correct, text);
        addValue(correct, id);
      }
    }
  }

  return correct;
}

export function isAnswerCorrect(question: any, submittedAnswer: any): boolean {
  const correct = getCorrectAnswerSet(question);

  if (Array.isArray(submittedAnswer)) {
    return submittedAnswer.some((answer) => correct.has(normalizeAnswer(answer)));
  }

  return correct.has(normalizeAnswer(submittedAnswer));
}
