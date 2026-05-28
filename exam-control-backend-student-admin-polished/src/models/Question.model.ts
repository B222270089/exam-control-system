import { Schema, model, Types, InferSchemaType } from "mongoose";

const OptionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: true }
);

const QuestionSchema = new Schema(
  {
    examId: { type: Types.ObjectId, ref: "Exam", required: true, index: true },
    sectionKey: { type: String, default: "default", index: true },
    type: {
      type: String,
      enum: [
        "single_choice",
        "multiple_select",
        "true_false",
        "fill_blank",
        "short_answer",
        "long_answer",
        "matching",
        "ordering",
        "dropdown",
        "image_question",
        "image_labeling",
        "hotspot",
        "reading",
        "calculation",
        "code_output"
      ],
      required: true,
      index: true
    },
    instruction: { type: String, default: "" },
    text: { type: String, required: true },
    mediaUrl: { type: String, default: "" },
    options: { type: [OptionSchema], default: [] },
    correctAnswer: { type: Schema.Types.Mixed, required: false },
    points: { type: Number, min: 0, default: 1 },
    timeLimitSeconds: { type: Number, min: 5, default: 60 },
    topic: { type: String, default: "" },
    difficulty: { type: String, default: "" },
    inputMode: { type: String, enum: ["tap_only", "mouse_only", "limited_keyboard", "writing"], default: "mouse_only" },
    structuredData: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type QuestionDocument = InferSchemaType<typeof QuestionSchema>;
export const Question = model("Question", QuestionSchema);
