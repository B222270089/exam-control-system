export function normalizeAnswer(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function addValue(set: Set<string>, value: any) {
  if (value === undefined || value === null) return;
  const normalized = normalizeAnswer(value);
  if (normalized) set.add(normalized);
}

function optionText(option: any) {
  if (typeof option === "string") return option;
  return option?.text ?? option?.label ?? option?.value ?? option?.title ?? option?.answer ?? "";
}

function optionId(option: any) {
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

  if (typeof question.correctIndex === "number") addValue(correct, question.correctIndex);
  if (typeof question.correctOptionIndex === "number") addValue(correct, question.correctOptionIndex);
  if (typeof question.answerIndex === "number") addValue(correct, question.answerIndex);

  if (Array.isArray(question.correctAnswers)) {
    for (const value of question.correctAnswers) addValue(correct, value);
  }

  if (Array.isArray(question.answers)) {
    for (const value of question.answers) addValue(correct, value);
  }

  if (Array.isArray(question.options)) {
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];
      const letter = String.fromCharCode(65 + i);
      const text = optionText(option);
      const id = optionId(option);

      const markedCorrect =
        option?.isCorrect === true ||
        option?.correct === true ||
        option?.is_answer === true ||
        option?.isAnswer === true;

      const matchesStoredCorrect =
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(text) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(id) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(letter) ||
        normalizeAnswer(question.correctAnswer) === normalizeAnswer(i) ||
        normalizeAnswer(question.answer) === normalizeAnswer(text) ||
        normalizeAnswer(question.answer) === normalizeAnswer(id) ||
        normalizeAnswer(question.answer) === normalizeAnswer(letter) ||
        normalizeAnswer(question.answer) === normalizeAnswer(i);

      const indexCorrect =
        question.correctIndex === i ||
        question.correctOptionIndex === i ||
        question.answerIndex === i;

      if (markedCorrect || matchesStoredCorrect || indexCorrect) {
        addValue(correct, letter);
        addValue(correct, i);
        addValue(correct, String(i));
        addValue(correct, text);
        addValue(correct, id);
      }
    }
  }

  return correct;
}

export function isAnswerCorrect(question: any, submittedAnswer: any): boolean {
  const correct = getCorrectAnswerSet(question);

  if (correct.size === 0) return false;

  if (Array.isArray(submittedAnswer)) {
    return submittedAnswer.some((answer) => correct.has(normalizeAnswer(answer)));
  }

  return correct.has(normalizeAnswer(submittedAnswer));
}

export function getReadableCorrectAnswer(question: any): string {
  const values = Array.from(getCorrectAnswerSet(question));
  return values[0] || "";
}

export function getReadableStudentAnswer(answer: any): string {
  if (Array.isArray(answer)) return answer.map(String).join(", ");
  return String(answer ?? "");
}
