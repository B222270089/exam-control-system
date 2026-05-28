import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  accessExamByCode,
  codeStudentLogin,
  listAvailableExams,
  devStudentLogin,
  teamsSsoLogin
} from "../../api/student";
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
  if (exam.status === "completed") return "Дууссан";
  return exam.status;
}

function isFinishedOrLocked(exam: StudentExamCard) {
  return exam.sessionStatus === "submitted" || String(exam.sessionStatus || "").includes("banned");
}

function isActiveExam(exam: StudentExamCard) {
  return ["ready", "open"].includes(String(exam.status)) && !isFinishedOrLocked(exam);
}

export function StudentExamListPage() {
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const [exams, setExams] = useState<StudentExamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const autoNavigatedRef = useRef(false);

  async function ensureStudentLogin() {
    const token = localStorage.getItem("studentToken");
    if (token) return true;

    if (import.meta.env.VITE_ENABLE_TEAMS_SSO === "true") {
      const teamsToken = await tryGetTeamsSsoToken();

      if (teamsToken) {
        await teamsSsoLogin(teamsToken);
        setRole("student");
        return true;
      }
    }

    if (import.meta.env.VITE_ALLOW_DEV_STUDENT_LOGIN === "true") {
      const name = import.meta.env.VITE_DEV_STUDENT_NAME || "Demo Student";
      const email = import.meta.env.VITE_DEV_STUDENT_EMAIL || "student@example.com";
      await devStudentLogin(name, email);
      setRole("student");
      return true;
    }

    return false;
  }

  async function load() {
    try {
      setError("");

      const loggedIn = await ensureStudentLogin();

      if (!loggedIn) {
        setExams([]);
        setLoading(false);
        return;
      }

      const data = await listAvailableExams();
      const allExams = Array.isArray(data) ? data : [];
      const activeExams = allExams.filter(isActiveExam);

      if (activeExams.length === 1 && !autoNavigatedRef.current) {
        autoNavigatedRef.current = true;
        const examId = activeExams[0].id || activeExams[0]._id;
        navigate(`/student/entry/${examId}`);
        return;
      }

      setExams(activeExams);
    } catch (err: any) {
      const message = getErrorMessage(err);

      if (
        message.includes("Student not found") ||
        message.includes("Student access required") ||
        message.includes("Teams SSO") ||
        err?.response?.status === 403
      ) {
        setExams([]);
        setError("");
      } else {
        setError(message || "Шалгалтын мэдээлэл авах үед алдаа гарлаа.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();

    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Багшаас өгсөн шалгалтын нууц үгийг оруулна уу.");
      return;
    }

    setCodeLoading(true);
    setError("");

    try {
      let data: any;

      if (!localStorage.getItem("studentToken")) {
        data = await codeStudentLogin(cleanCode);
      } else {
        data = await accessExamByCode(cleanCode);
      }

      const examId = data.exam.id || data.exam._id;

      localStorage.removeItem("adminToken");
      localStorage.setItem(`examCode:${examId}`, cleanCode);

      if (data.token) {
        localStorage.setItem("studentToken", data.token);
      }

      if (data.student) {
        localStorage.setItem("student", JSON.stringify(data.student));
      }

      setRole("student");
      navigate(`/student/entry/${examId}?code=${encodeURIComponent(cleanCode)}`);
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message || "Нууц үг шалгах үед алдаа гарлаа.");
    } finally {
      setCodeLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = window.setInterval(() => {
      load();
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="student-centered">
        <Loading text="Шалгалтын мэдээлэл шалгаж байна..." />
      </div>
    );
  }

  return (
    <div className="student-centered scrollable">
      <section className="exam-card rules-card">
        <div className="page-header compact">
          <div>
            <h1>Шалгалтад нэвтрэх</h1>
            <p>
              Энэ шалгалтыг Microsoft Teams бүртгэлтэй сурагчид өгнө. Хэрэв систем таны Teams
              бүртгэлийг автоматаар танихгүй бол багшаас өгсөн шалгалтын нууц үгийг оруулна уу.
            </p>
          </div>
          <button className="secondary" onClick={load}>
            Одоо шалгах
          </button>
        </div>

        <form className="code-access-box" onSubmit={submitCode}>
          <div>
            <strong>Багшаас өгсөн нууц үгээр орох</strong>
            <p className="muted">
              Нууц үгийг зөв оруулбал та шууд шалгалтын хүлээлгийн өрөө эсвэл зааврын хэсэг рүү орно.
              Нууц үгийг нэг л удаа оруулна.
            </p>
          </div>

          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="password123"
            autoComplete="off"
          />

          <button disabled={codeLoading || !code.trim()}>
            {codeLoading ? "Шалгаж байна..." : "Нэвтрэх"}
          </button>
        </form>

        {error && <ErrorBox message={error} />}

        {exams.length === 0 ? (
          <EmptyState
            title="Одоогоор идэвхтэй шалгалт алга"
            text="Багш шалгалтыг эхлүүлсэн эсэхийг шалгана уу. Хэрэв таны Teams бүртгэл танигдахгүй бол багшаас нууц үгээ аваарай."
          />
        ) : (
          <div className="exam-list-grid">
            {exams.map((exam) => {
              const examId = exam.id || exam._id;
              const disabled = exam.status === "closed" || exam.status === "completed" || isFinishedOrLocked(exam);

              return (
                <article key={examId} className="exam-list-card">
                  <div className="exam-list-card-head">
                    <div>
                      <h2>{exam.title}</h2>
                      <p>{exam.subject || "Ерөнхий шалгалт"}</p>
                    </div>
                    <span className={`status ${exam.sessionStatus || exam.status}`}>
                      {statusLabel(exam)}
                    </span>
                  </div>

                  <div className="mini-stats">
                    <span>{exam.totalQuestions} асуулт</span>
                    <span>{exam.perQuestionTimeSeconds} сек / асуулт</span>
                    <span>30 оноонд шилжинэ</span>
                  </div>

                  <p className="muted">
                    {exam.description || "Шалгалтын дэлгэрэнгүй тайлбар оруулаагүй байна."}
                  </p>

                  <button disabled={disabled} onClick={() => navigate(`/student/entry/${examId}`)}>
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
