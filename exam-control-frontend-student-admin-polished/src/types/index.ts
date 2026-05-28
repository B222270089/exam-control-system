export type ExamStatus = "draft" | "ready" | "open" | "closed" | "completed";

export type QuestionType =
  | "single_choice"
  | "multiple_select"
  | "true_false"
  | "fill_blank"
  | "short_answer"
  | "long_answer"
  | "matching"
  | "ordering"
  | "dropdown"
  | "image_question"
  | "image_labeling"
  | "hotspot"
  | "reading"
  | "calculation"
  | "code_output";

export type InputMode = "tap_only" | "mouse_only" | "limited_keyboard" | "writing";

export interface Admin {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface Student {
  _id: string;
  displayName: string;
  email: string;
  microsoftUserId: string;
  tenantId?: string;
  teamIds?: string[];
}

export interface Exam {
  _id: string;
  title: string;
  subject?: string;
  description?: string;
  status: ExamStatus;
  totalQuestions: number;
  perQuestionTimeSeconds: number;
  rawTotalScore: number;
  convertedTotalScore: number;
  accessCode?: string;
  allowCodeFallback?: boolean;
  requireTeamsForPrimaryAccess?: boolean;
  majorViolationLimit: number;
  banOnViolationNumber: number;
  createdAt?: string;
  openedAt?: string;
  closedAt?: string;
}

export interface OptionItem {
  _id?: string;
  id?: string;
  key: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  _id: string;
  id?: string;
  examId?: string;
  sectionKey?: string;
  type: QuestionType;
  instruction?: string;
  text: string;
  mediaUrl?: string;
  options?: OptionItem[];
  correctAnswer?: unknown;
  points: number;
  timeLimitSeconds: number;
  topic?: string;
  difficulty?: string;
  inputMode?: InputMode;
  structuredData?: any;
}


export interface StudentExamCard {
  id: string;
  _id: string;
  title: string;
  subject?: string;
  description?: string;
  status: ExamStatus;
  totalQuestions: number;
  perQuestionTimeSeconds: number;
  convertedTotalScore: number;
  accessCode?: string;
  allowCodeFallback?: boolean;
  requireTeamsForPrimaryAccess?: boolean;
  majorViolationLimit: number;
  banOnViolationNumber: number;
  sessionId?: string | null;
  sessionStatus?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
}

export interface CurrentQuestionPayload {
  sessionId: string;
  questionNumber: number;
  totalQuestions: number;
  majorViolationCount: number;
  minorViolationCount: number;
  displayedAt?: string | null;
  serverNow?: string | null;
  status: string;
  question: Question;
}

export interface ResultSummary {
  message?: string;
  status: string;
  totalQuestions: number;
  correctCount: number;
  rawScore: number;
  rawTotal: number;
  convertedScore: number;
  convertedTotal: number;
  submittedAt?: string;
}
