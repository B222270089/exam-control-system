import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createExam, listExams } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import type { Exam } from "../../types";
import { EmptyState, ErrorBox, Loading } from "../../components/State";
import { formatDateTime } from "../../utils/format";

function statusText(status: string) {
  const map: Record<string, string> = { draft: "Ноорог", ready: "Бэлэн", open: "Нээлттэй", closed: "Хаалттай", completed: "Дууссан" };
  return map[status] || status;
}

function nextAction(exam: Exam) {
  if (exam.status === "draft") return "Асуулт оруулж, шалгалтыг бэлэн болгоно";
  if (exam.status === "ready") return "Сурагчид хүлээлгийн өрөөнд орно. Та эхлүүлэх товч дарна";
  if (exam.status === "open") return "Live monitoring шалгана";
  if (exam.status === "closed") return "Үр дүнг шалгана";
  return "Тайлан харах";
}

export function AdminDashboardPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "Шинэ шалгалт", subject: "Ерөнхий шалгалт", totalQuestions: 60, perQuestionTimeSeconds: 60, description: "", accessCode: "" });

  async function load() {
    setLoading(true);
    try {
      setExams(await listExams());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    draft: exams.filter(e => e.status === "draft").length,
    ready: exams.filter(e => e.status === "ready").length,
    open: exams.filter(e => e.status === "open").length,
    completed: exams.filter(e => e.status === "completed" || e.status === "closed").length
  }), [exams]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const created = await createExam({
        title: form.title,
        subject: form.subject,
        description: form.description,
        totalQuestions: Number(form.totalQuestions),
        perQuestionTimeSeconds: Number(form.perQuestionTimeSeconds),
        rawTotalScore: Number(form.totalQuestions),
        convertedTotalScore: 30,
        accessCode: form.accessCode.trim() || undefined,
        allowCodeFallback: true,
        requireTeamsForPrimaryAccess: true,
        teamsAccess: { accessMode: import.meta.env.VITE_ALLOW_DEV_STUDENT_LOGIN === "true" ? "open_dev" : "team_member_only", allowedEmails: [] }
      });
      await load();
      window.location.href = `/admin/exams/${created.exam._id}/questions`;
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Админы шалгалтын самбар</h1>
          <p>Эндээс шалгалт үүсгэх, асуулт засах, шалгалт эхлүүлэх/хаах, сурагчийн үр дүн харах бүх үйлдлийг хийнэ.</p>
        </div>
        <button className="secondary" onClick={load}>Жагсаалт шинэчлэх</button>
      </section>

      {error && <ErrorBox message={error} />}

      <section className="panel wizard-panel">
        <h2>Ажлын дараалал</h2>
        <div className="wizard-steps">
          <div><strong>1</strong><span>Шалгалт үүсгэнэ</span></div>
          <div><strong>2</strong><span>Paste / Excel / гараар асуулт оруулна</span></div>
          <div><strong>3</strong><span>Preview харж, алдааг засна</span></div>
          <div><strong>4</strong><span>Бэлэн болгоход сурагчид хүлээлгийн өрөө рүү орно</span></div>
          <div><strong>5</strong><span>Шалгалт эхлүүлэх товч дарна</span></div>
          <div><strong>6</strong><span>Live monitoring ба үр дүн харна</span></div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card"><span>Ноорог</span><strong>{stats.draft}</strong></article>
        <article className="stat-card"><span>Бэлэн</span><strong>{stats.ready}</strong></article>
        <article className="stat-card"><span>Нээлттэй</span><strong>{stats.open}</strong></article>
        <article className="stat-card"><span>Дууссан/хаалттай</span><strong>{stats.completed}</strong></article>
      </section>

      <form className="panel grid-form" onSubmit={onCreate}>
        <h2>Шинэ шалгалт үүсгэх</h2>
        <label>Шалгалтын нэр<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Хичээл<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
        <label>Ашиглах асуултын тоо<input type="number" min={1} value={form.totalQuestions} onChange={(e) => setForm({ ...form, totalQuestions: Number(e.target.value) })} /></label>
        <label>Default хугацаа /сек/<input type="number" min={5} value={form.perQuestionTimeSeconds} onChange={(e) => setForm({ ...form, perQuestionTimeSeconds: Number(e.target.value) })} /></label>
        <label>Шалгалтын нууц үг<input value={form.accessCode} onChange={(e) => setForm({ ...form, accessCode: e.target.value })} placeholder="Жишээ: password123. Хоосон үлдээвэл автоматаар үүснэ" /></label>
        <label className="full-span">Тайлбар<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Сурагчдад харагдах товч тайлбар" /></label>
        <button disabled={creating}>{creating ? "Үүсгэж байна..." : "Үүсгээд асуулт нэмэх"}</button>
      </form>

      <section className="panel">
        <h2>Шалгалтууд</h2>
        {exams.length === 0 ? <EmptyState title="Одоогоор шалгалт алга" /> : (
          <div className="exam-admin-grid">
            {exams.map((exam) => (
              <article className="admin-exam-card" key={exam._id}>
                <div className="exam-list-card-head">
                  <div><h3>{exam.title}</h3><p>{exam.subject}</p></div>
                  <span className={`status ${exam.status}`}>{statusText(exam.status)}</span>
                </div>
                <p className="muted">{exam.description || "Тайлбар оруулаагүй."}</p>
                <div className="mini-stats">
                  <span>{exam.totalQuestions} асуулт</span>
                  <span>{exam.perQuestionTimeSeconds} сек</span>
                  <span>30 оноонд шилжинэ</span>
                  <span>{formatDateTime(exam.createdAt)}</span>
                </div>
                <div className="next-action"><strong>Дараагийн алхам:</strong> {nextAction(exam)}</div>
                <div className="actions mt">
                  <Link to={`/admin/exams/${exam._id}/questions`}>Асуулт засах / Upload</Link>
                  <Link to={`/admin/exams/${exam._id}/control`}>Удирдах</Link>
                  <Link to={`/admin/exams/${exam._id}/live`}>Live хяналт</Link>
                  <Link to={`/admin/exams/${exam._id}/results`}>Үр дүн</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
