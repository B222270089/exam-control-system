import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { confirmPastedQuestions, confirmQuestionsExcel, createQuestion, deleteQuestion, listQuestions, previewPastedQuestions, previewQuestionsExcel, updateQuestion } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import type { Question, QuestionType } from "../../types";
import { EmptyState, ErrorBox, Loading } from "../../components/State";

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: "single_choice", label: "Нэг сонголттой" },
  { value: "multiple_select", label: "Олон сонголттой" },
  { value: "true_false", label: "Үнэн / Худал" },
  { value: "fill_blank", label: "Хоосон зай нөхөх" },
  { value: "short_answer", label: "Богино хариулт" },
  { value: "image_question", label: "Зурагтай асуулт" },
  { value: "matching", label: "Харгалзуулах" },
  { value: "ordering", label: "Дараалалд оруулах" },
  { value: "image_labeling", label: "Зураг шошголох" },
  { value: "hotspot", label: "Hotspot" }
];

function emptyForm() {
  return {
    type: "single_choice" as QuestionType,
    instruction: "Зөв хариултыг сонгоно уу.",
    text: "",
    points: 1,
    timeLimitSeconds: 60,
    mediaUrl: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A"
  };
}

export function QuestionBuilderPage() {
  const { examId = "" } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [preview, setPreview] = useState<Question[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyForm());

  async function load() {
    setLoading(true);
    try {
      setQuestions(await listQuestions(examId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [examId]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    questions.forEach(q => { byType[q.type] = (byType[q.type] || 0) + 1; });
    return byType;
  }, [questions]);

  function makePayload() {
    const options = ["A", "B", "C", "D"].map((key) => ({
      key,
      text: (form as any)[`option${key}`] || "",
      isCorrect: form.correctAnswer.split(",").map((x) => x.trim().toUpperCase()).includes(key)
    })).filter((option) => option.text.trim());

    return {
      type: form.type,
      instruction: form.instruction,
      text: form.text,
      mediaUrl: form.mediaUrl,
      points: Number(form.points),
      timeLimitSeconds: Number(form.timeLimitSeconds),
      inputMode: ["fill_blank", "short_answer"].includes(form.type) ? "limited_keyboard" : "mouse_only",
      options: ["single_choice", "multiple_select", "true_false", "image_question", "dropdown"].includes(form.type) ? options : [],
      correctAnswer: ["fill_blank", "short_answer"].includes(form.type) ? form.correctAnswer : form.correctAnswer
    };
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing?._id) {
        await updateQuestion(editing._id, makePayload() as any);
        setSuccess("Асуулт шинэчлэгдлээ.");
        setEditing(null);
      } else {
        await createQuestion(examId, makePayload() as any);
        setSuccess("Асуулт хадгалагдлаа.");
      }
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onPreview() {
    if (!file) return;
    setError("");
    setSuccess("");
    try {
      const data = await previewQuestionsExcel(examId, file);
      setPreview(data.previewQuestions || []);
      setInvalidRows(data.invalidRows || []);
      setSuccess(`${data.previewQuestions?.length || 0} асуулт танигдлаа. Хянаад баталгаажуулна уу.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }


  async function onPreviewPastedText() {
    setError("");
    setSuccess("");
    try {
      const data = await previewPastedQuestions(examId, pastedText);
      setPreview(data.previewQuestions as Question[]);
      setInvalidRows(data.invalidRows || []);
      if ((data.previewQuestions || []).length === 0) setError("Текстээс хадгалах боломжтой асуулт илэрсэнгүй. Форматаа шалгана уу.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onConfirmPreview() {
    setError("");
    try {
      const data = await confirmPastedQuestions(examId, preview);
      setSuccess(`${data.insertedCount} асуулт хадгалагдлаа.`);
      setPreview([]);
      setInvalidRows([]);
      setFile(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function startEdit(q: Question) {
    setEditing(q);
    const options: any = {};
    (q.options || []).forEach(o => { options[`option${o.key}`] = o.text; });
    const correct = (q.options || []).filter(o => o.isCorrect).map(o => o.key).join(",") || String(q.correctAnswer || "");
    setForm({
      type: q.type,
      instruction: q.instruction || "",
      text: q.text,
      points: q.points,
      timeLimitSeconds: q.timeLimitSeconds,
      mediaUrl: q.mediaUrl || "",
      optionA: options.optionA || "",
      optionB: options.optionB || "",
      optionC: options.optionC || "",
      optionD: options.optionD || "",
      correctAnswer: correct || "A"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <Loading />;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><h1>Асуулт / даалгавар</h1><p>Гараар үүсгэх эсвэл Excel upload хийж, preview харж, алдааг зассаны дараа хадгална.</p></div>
        <div className="actions"><Link className="button secondary" to={`/admin/exams/${examId}/control`}>Эхлүүлэх хэсэг</Link><Link className="button secondary" to="/admin/dashboard">Dashboard</Link></div>
      </section>
      {error && <ErrorBox message={error} />}
      {success && <div className="success-box">{success}</div>}

      <section className="panel wizard-panel">
        <h2>Энэ хэсгийн дараалал</h2>
        <div className="wizard-steps compact-steps"><div><strong>1</strong><span>Файл сонгоно</span></div><div><strong>2</strong><span>Preview харна</span></div><div><strong>3</strong><span>Алдаатай мөрийг засна</span></div><div><strong>4</strong><span>Баталгаажуулж хадгална</span></div></div>
      </section>

      <section className="panel split">
        <form className="question-form" onSubmit={onCreate}>
          <h2>{editing ? "Асуулт засах" : "Гараар асуулт нэмэх"}</h2>
          <label>Төрөл<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}>{questionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label>Заавар<input value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} /></label>
          <label>Асуултын текст<textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required /></label>
          <label>Зураг/media URL<input value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder="optional" /></label>
          <div className="two-col"><label>Оноо<input type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} /></label><label>Хугацаа /сек/<input type="number" min={5} value={form.timeLimitSeconds} onChange={(e) => setForm({ ...form, timeLimitSeconds: Number(e.target.value) })} /></label></div>
          {!['fill_blank', 'short_answer', 'long_answer'].includes(form.type) && <div className="options-editor"><label>A<input value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} /></label><label>B<input value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} /></label><label>C<input value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} /></label><label>D<input value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} /></label></div>}
          <label>Зөв хариулт<input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} placeholder="A эсвэл fill blank answer" /></label>
          <div className="actions"><button>{editing ? "Өөрчлөлт хадгалах" : "Асуулт хадгалах"}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyForm()); }}>Цуцлах</button>}</div>
        </form>

        <div className="upload-box">
          <h2>Paste file content → auto-create preview</h2>
          <p>Багш Word/PDF-ээс copy хийсэн текстээ энд paste хийнэ. Систем QUESTION блок, TYPE, TIME, POINTS, A-D сонголт, ANSWER мөрүүдийг уншиж preview үүсгэнэ.</p>
          <textarea className="paste-area" value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder={`QUESTION 1\nTYPE: single_choice\nTIME: 60\nPOINTS: 1\nChoose the correct answer.\nA) has lived\nB) lived\nC) lives\nD) live\nANSWER: A\n---\nQUESTION 2...`} />
          <button className="secondary" type="button" disabled={!pastedText.trim()} onClick={onPreviewPastedText}>Pasted text preview үүсгэх</button>
          <hr />
          <h2>Excel upload → preview → edit</h2>
          <p>Асуулт бүр өөрийн timeLimitSeconds буюу хугацаатай. Template багана: questionType, instruction, questionText, optionA-D, correctAnswer, points, timeLimitSeconds, topic, difficulty, imageUrl.</p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="secondary" disabled={!file} onClick={onPreview}>Excel preview үүсгэх</button>
          {invalidRows.length > 0 && <div className="error-box">{invalidRows.length} мөр алдаатай байна. Доорх preview дээр хадгалагдаагүй.</div>}
        </div>
      </section>

      {preview.length > 0 && <section className="panel">
        <h2>Excel preview: {preview.length} асуулт</h2>
        <p className="muted">Энд текст, зөв хариулт, оноо, хугацааг засаж болно. Баталгаажуулах хүртэл database-д хадгалахгүй.</p>
        <div className="preview-list">
          {preview.map((q, index) => <article className="preview-row" key={index}>
            <div className="two-col"><label>Төрөл<select value={q.type} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, type: e.target.value as QuestionType } : item))}>{questionTypes.map(t => <option value={t.value} key={t.value}>{t.label}</option>)}</select></label><label>Хугацаа<input type="number" value={q.timeLimitSeconds} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, timeLimitSeconds: Number(e.target.value) } : item))} /></label></div>
            <label>Асуулт<textarea value={q.text} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, text: e.target.value } : item))} /></label>
            {Array.isArray(q.options) && q.options.length > 0 && <div className="option-preview-editor">
              {q.options.map((option, optionIndex) => <label key={option.key || optionIndex}>Сонголт {option.key || optionIndex + 1}<input value={option.text} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, options: (item.options || []).map((op, oi) => oi === optionIndex ? { ...op, text: e.target.value } : op) } : item))} /></label>)}
            </div>}
            <div className="two-col"><label>Зөв хариулт<input value={String(q.correctAnswer || "")} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, correctAnswer: e.target.value } : item))} /></label><label>Оноо<input type="number" value={q.points} onChange={(e) => setPreview(prev => prev.map((item, i) => i === index ? { ...item, points: Number(e.target.value) } : item))} /></label></div>
            <button className="danger small" onClick={() => setPreview(prev => prev.filter((_, i) => i !== index))}>Preview-ээс хасах</button>
          </article>)}
        </div>
        <div className="actions mt"><button onClick={onConfirmPreview}>Preview-г баталгаажуулж хадгалах</button><button className="secondary" onClick={() => setPreview([])}>Цуцлах</button></div>
      </section>}

      <section className="panel">
        <div className="page-header compact"><div><h2>Оруулсан асуултууд: {questions.length}</h2><p className="muted">Төрлөөр: {Object.entries(counts).map(([k,v]) => `${k}: ${v}`).join(" • ") || "-"}</p></div></div>
        {questions.length === 0 ? <EmptyState title="Асуулт байхгүй" text="Гараар нэмэх эсвэл Excel preview хийж хадгална уу." /> : <div className="question-list">
          {questions.map((q, index) => <article className="question-row" key={q._id}>
            <div><strong>{index + 1}. {q.text}</strong><p className="muted">{q.type} • {q.points} оноо • {q.timeLimitSeconds} сек • {q.topic || "сэдэвгүй"}</p></div>
            <div className="actions"><button className="secondary small" onClick={() => startEdit(q)}>Засах</button><button className="danger small" onClick={async () => { await deleteQuestion(q._id); await load(); }}>Устгах</button></div>
          </article>)}
        </div>}
      </section>
    </div>
  );
}
