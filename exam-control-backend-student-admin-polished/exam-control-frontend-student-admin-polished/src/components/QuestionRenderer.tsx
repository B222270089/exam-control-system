import type { Question } from "../types";

interface Props {
  question: Question;
  answer: any;
  setAnswer: (answer: any) => void;
}

export function QuestionRenderer({ question, answer, setAnswer }: Props) {
  const options = question.options || [];

  if (question.type === "single_choice" || question.type === "true_false" || question.type === "dropdown" || question.type === "image_question") {
    return (
      <div className="answer-grid">
        {options.map((option) => {
          const id = option.id || option._id || option.key;
          return (
            <button
              type="button"
              className={`option-card ${answer === id ? "selected" : ""}`}
              key={id}
              onClick={() => setAnswer(id)}
            >
              <span className="option-key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "multiple_select") {
    const selected: string[] = Array.isArray(answer) ? answer : [];
    return (
      <div className="answer-grid">
        {options.map((option) => {
          const id = String(option.id || option._id || option.key);
          const isSelected = selected.includes(id);
          return (
            <button
              type="button"
              className={`option-card ${isSelected ? "selected" : ""}`}
              key={id}
              onClick={() => setAnswer(isSelected ? selected.filter((x) => x !== id) : [...selected, id])}
            >
              <span className="option-key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (["fill_blank", "short_answer", "calculation", "code_output"].includes(question.type)) {
    return (
      <textarea
        className="answer-input"
        value={answer || ""}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Хариултаа энд бичнэ үү..."
        rows={question.type === "short_answer" ? 4 : 2}
      />
    );
  }

  if (question.type === "long_answer" || question.type === "reading") {
    return (
      <textarea
        className="answer-input large"
        value={answer || ""}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Дэлгэрэнгүй хариултаа энд бичнэ үү..."
        rows={8}
      />
    );
  }

  if (question.type === "matching") {
    return <StructuredFallback question={question} answer={answer} setAnswer={setAnswer} label="Харгалзуулах хариулт" />;
  }

  if (question.type === "ordering") {
    return <StructuredFallback question={question} answer={answer} setAnswer={setAnswer} label="Дарааллын хариулт" />;
  }

  if (question.type === "image_labeling" || question.type === "hotspot") {
    return <StructuredFallback question={question} answer={answer} setAnswer={setAnswer} label="Зураг/диаграммын хариулт" />;
  }

  return <StructuredFallback question={question} answer={answer} setAnswer={setAnswer} label="Хариулт" />;
}

function StructuredFallback({ question, answer, setAnswer, label }: Props & { label: string }) {
  const items = question.structuredData?.items || question.options || [];
  return (
    <div className="structured-box">
      <p className="muted">{label}</p>
      {Array.isArray(items) && items.length > 0 && (
        <div className="pill-list">
          {items.map((item: any, index: number) => (
            <button key={index} className="pill" type="button" onClick={() => setAnswer(item.id || item.key || item.text || String(index))}>
              {item.text || item.label || item.key || `Item ${index + 1}`}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="answer-input"
        value={typeof answer === "string" ? answer : JSON.stringify(answer || "")}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Энэ төрлийн даалгаврын хариултыг энд түр хадгална. Дараагийн хувилбарт visual builder нэмнэ."
        rows={4}
      />
    </div>
  );
}
