import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getExam, listQuestions, updateExamStatus } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";
import type { Exam, Question } from "../../types";

function statusText(status?: string) {
  const map: Record<string, string> = { draft: "Ноорог", ready: "Бэлэн", open: "Нээлттэй", closed: "Хаалттай", completed: "Дууссан" };
  return status ? map[status] || status : "-";
}

export function ExamControlPage() {
  const { examId = "" } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [examData, questionData] = await Promise.all([getExam(examId), listQuestions(examId)]);
      setExam(examData.exam);
      setQuestions(questionData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [examId]);

  const checklist = useMemo(() => {
    return [
      { label: "Шалгалтын үндсэн мэдээлэл үүссэн", done: !!exam?.title },
      { label: "Асуулт/даалгавар нэмэгдсэн", done: questions.length > 0 },
      { label: "Асуулт бүр хугацаатай", done: questions.length > 0 && questions.every(q => Number(q.timeLimitSeconds) >= 5) },
      { label: "Оноо тохирсон", done: questions.length > 0 && questions.every(q => Number(q.points) >= 0) },
      { label: "Дүрэм: 3 удаа хүртэл анхааруулга, 4 дэх дээр түгжинэ", done: exam?.majorViolationLimit === 3 && exam?.banOnViolationNumber === 4 }
    ];
  }, [exam, questions]);
  const ready = checklist.every(i => i.done);

  async function setStatus(statusValue: string) {
    setError("");
    setSuccess("");
    try {
      if (statusValue === "ready" && questions.length === 0) {
        setError("Шалгалтыг бэлэн болгохын өмнө дор хаяж 1 асуулт нэмнэ үү.");
        return;
      }
      const updated = await updateExamStatus(examId, statusValue);
      setExam(updated);
      setSuccess(`Шалгалтын төлөв: ${statusText(updated.status)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><h1>Шалгалтыг удирдах</h1><p>Энэ хуудсаар шалгалтыг бэлэн болгох, эхлүүлэх, хаах, student link авах үйлдлийг хийнэ.</p></div>
        <div className="actions"><Link className="button secondary" to={`/admin/exams/${examId}/questions`}>Асуулт засах</Link><Link className="button secondary" to={`/admin/exams/${examId}/live`}>Live</Link></div>
      </section>
      {error && <ErrorBox message={error} />}
      {success && <div className="success-box">{success}</div>}

      <section className="panel split">
        <div>
          <h2>{exam?.title}</h2>
          <p className="muted">Одоогийн төлөв: <strong>{statusText(exam?.status)}</strong></p>
          <div className="summary-list">
            <div><span>Асуулт</span><strong>{questions.length} / {exam?.totalQuestions}</strong></div>
            <div><span>Хугацаа</span><strong>{exam?.perQuestionTimeSeconds} сек default</strong></div>
            <div><span>Оноо</span><strong>{exam?.rawTotalScore} → {exam?.convertedTotalScore}</strong></div>
            <div><span>Хүнд зөрчил</span><strong>3 удаа хүртэл анхааруулга, 4 дэх дээр түгжинэ</strong></div>
          </div>
        </div>
        <div className="checklist">
          <h3>Бэлэн эсэх checklist</h3>
          {checklist.map(item => <div key={item.label} className={item.done ? "check ok" : "check no"}><strong>{item.done ? "✓" : "!"}</strong><span>{item.label}</span></div>)}
        </div>
      </section>

      <section className="panel control-grid">
        <button className="secondary" disabled={!ready} onClick={() => setStatus("ready")}>1. Сурагчдыг хүлээлгийн өрөөнд оруулах</button>
        <button disabled={!ready} onClick={() => setStatus("open")}>2. Шалгалт эхлүүлэх</button>
        <button className="warning" onClick={() => setStatus("closed")}>3. Шалгалт хаах</button>
        <button className="secondary" onClick={() => setStatus("completed")}>4. Дууссан гэж тэмдэглэх</button>
      </section>

      <section className="panel">
        <h2>Сурагчийн холбоос</h2>
        <p>Энэ холбоосыг Teams дотор байршуулж болно. Teams танигдахгүй бол сурагч багшаас авсан шалгалтын нууц үгээ оруулна.</p>
        <code>{`${window.location.origin}/student/entry/${examId}`}</code>
        <div className="actions mt"><Link to={`/student/exams`} target="_blank">Сурагчийн харагдах хуудсыг шалгах</Link><Link to={`/admin/exams/${examId}/results`}>Үр дүн</Link></div>
      </section>
    </div>
  );
}
