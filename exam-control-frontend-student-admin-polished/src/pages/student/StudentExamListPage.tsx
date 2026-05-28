import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accessExamByCode, codeStudentLogin, listAvailableExams, devStudentLogin, teamsSsoLogin } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { EmptyState, ErrorBox, Loading } from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import type { StudentExamCard } from "../../types";
import { tryGetTeamsSsoToken } from "../../utils/teamsSso";

function statusLabel(exam: StudentExamCard) {
  if (exam.sessionStatus === "submitted") return "Илгээсэн";
  if (String(exam.sessionStatus || "").includes("banned")) return "Түгжигдсэн";
  if (exam.status === "open") return "Нээлттэй";
  if (exam.status === "ready") return "Багш эхлүүлэхийг хүлээж байна";
  if (exam.status === "closed") return "Хаалттай";
  return exam.status;
}

export function StudentExamListPage() {
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const [exams, setExams] = useState<StudentExamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  async function ensureStudentLogin() {
    const token = localStorage.getItem("studentToken");
    if (token) return;

    if (import.meta.env.VITE_ENABLE_TEAMS_SSO === "true") {
      const teamsToken = await tryGetTeamsSsoToken();
      if (teamsToken) {
        await teamsSsoLogin(teamsToken);
        setRole("student");
        return;
      }
    }

    if (import.meta.env.VITE_ALLOW_DEV_STUDENT_LOGIN === "true") {
      const name = import.meta.env.VITE_DEV_STUDENT_NAME || "Demo Student";
      const email = import.meta.env.VITE_DEV_STUDENT_EMAIL || "student@example.com";
      await devStudentLogin(name, email);
      setRole("student");
      return;
    }

    throw new Error("Teams SSO автоматаар танигдсангүй. Багшаас өгсөн шалгалтын кодоор орох боломжтой.");
  }

  async function load() {
    try {
      await ensureStudentLogin();
      const data = await listAvailableExams();
      setExams(data);
      setError("");
    } catch (err: any) {
      const message = getErrorMessage(err);
      if (message.includes("Student not found") || message.includes("Student access required") || message.includes("Teams SSO")) {
        setExams([]);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }


  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setCodeLoading(true);
    setError("");
    try {
      if (!localStorage.getItem("studentToken")) {
        const data = await codeStudentLogin(code.trim());
        localStorage.setItem(`examCode:${data.exam.id || data.exam._id}`, code.trim());
        setRole("student");
        navigate(`/student/entry/${data.exam.id || data.exam._id}?code=${encodeURIComponent(code.trim())}`);
        return;
      }
      const data = await accessExamByCode(code.trim());
      localStorage.setItem(`examCode:${data.exam.id || data.exam._id}`, code.trim());
      navigate(`/student/entry/${data.exam.id || data.exam._id}?code=${encodeURIComponent(code.trim())}`);
    } catch (err: any) {
      const message = getErrorMessage(err);
      if (message.includes("Student not found") || message.includes("Student access required") || message.includes("Teams SSO")) {
        setExams([]);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setCodeLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading) return <div className="student-centered"><Loading text="Шалгалтын жагсаалт ачаалж байна..." /></div>;

  return (
    <div className="student-centered scrollable">
      <section className="exam-card rules-card">
        <div className="page-header compact">
          <div>
            <h1>Миний шалгалтууд</h1>
            <p>Teams account танигдсан бол таны шалгалт энд харагдана. Шалгалт эхлээгүй бол хүлээлгийн өрөө рүү орно. Энэ жагсаалт 5 секунд тутамд шинэчлэгдэнэ.</p>
          </div>
          <button className="secondary" onClick={load}>Одоо шинэчлэх</button>
        </div>
        <form className="code-access-box" onSubmit={submitCode}>
          <div>
            <strong>Шалгалтын нууц үгээр орох</strong>
            <p className="muted">Teams account автоматаар танигдахгүй бол багшаас өгсөн шалгалтын кодыг нэг удаа оруулна. Нууц үгийн жишээ: password123. Энэ шалгалтын одоогийн нууц үг: CODE-60</p>
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="password123" />
          <button disabled={codeLoading || !code.trim()}>{codeLoading ? "Шалгаж байна..." : "Нэвтрэх"}</button>
        </form>
        {error && <ErrorBox message={error} />}
        {exams.length === 0 ? <EmptyState title="Одоогоор жагсаалтаар харагдах шалгалт алга" text="Teams account танигдахгүй бол багшаасаа шалгалтын нууц үг авч оруулна уу." /> : (
          <div className="exam-list-grid">
            {exams.map((exam) => {
              const disabled = exam.status === "closed" || exam.status === "completed";
              return (
                <article key={exam.id} className="exam-list-card">
                  <div className="exam-list-card-head">
                    <div>
                      <h2>{exam.title}</h2>
                      <p>{exam.subject || "Ерөнхий шалгалт"}</p>
                    </div>
                    <span className={`status ${exam.sessionStatus || exam.status}`}>{statusLabel(exam)}</span>
                  </div>
                  <div className="mini-stats">
                    <span>{exam.totalQuestions} асуулт</span>
                    <span>{exam.perQuestionTimeSeconds} сек / асуулт</span>
                    <span>Хүнд зөрчил {exam.majorViolationLimit} удаа хүртэл, {exam.banOnViolationNumber} дэх дээр түгжинэ</span>
                    <span>30 оноонд шилжинэ</span>
                  </div>
                  <p className="muted">{exam.description || "Шалгалтын дэлгэрэнгүй тайлбар оруулаагүй байна."}</p>
                  <button disabled={disabled} onClick={() => navigate(`/student/entry/${exam.id}`)}>
                    {exam.status === "open" ? "Шалгалтад орох" : "Хүлээлгийн өрөө рүү орох"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
