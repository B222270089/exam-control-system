import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { codeStudentLogin, listAvailableExams } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { EmptyState, ErrorBox, Loading } from "../../components/State";
import { useAuth } from "../../context/AuthContext";
import type { StudentExamCard } from "../../types";

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

  const [studentName, setStudentName] = useState(localStorage.getItem("studentName") || "");
  const [studentCode, setStudentCode] = useState(localStorage.getItem("studentCode") || "");
  const [examCode, setExamCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setError("");

      const token = localStorage.getItem("studentToken");

      if (!token) {
        setExams([]);
        setLoading(false);
        return;
      }

      const data = await listAvailableExams();
      const allExams = Array.isArray(data) ? data : [];
      const activeExams = allExams.filter(isActiveExam);

      if (activeExams.length === 1) {
        const examId = activeExams[0].id || activeExams[0]._id;
        navigate(`/student/entry/${examId}`);
        return;
      }

      setExams(activeExams);
    } catch (err: any) {
      const message = getErrorMessage(err);

      if (
        err?.response?.status === 403 ||
        message.includes("Student not found") ||
        message.includes("Student access required")
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

    const cleanName = studentName.trim();
    const cleanStudentCode = studentCode.trim();
    const cleanExamCode = examCode.trim();

    if (!cleanName || cleanName.length < 2) {
      setError("Овог нэрээ бүрэн оруулна уу.");
      return;
    }

    if (!cleanStudentCode || cleanStudentCode.length < 2) {
      setError("Оюутны код / сурагчийн дугаараа оруулна уу.");
      return;
    }

    if (!cleanExamCode) {
      setError("Багшаас өгсөн шалгалтын нууц үгийг оруулна уу.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data: any = await codeStudentLogin(cleanExamCode, cleanName, cleanStudentCode);
      const examId = data.exam.id || data.exam._id;

      localStorage.removeItem("adminToken");
      localStorage.setItem("studentToken", data.token);
      localStorage.setItem("student", JSON.stringify(data.student));
      localStorage.setItem(`examCode:${examId}`, cleanExamCode);
      localStorage.setItem("studentName", cleanName);
      localStorage.setItem("studentCode", cleanStudentCode);

      setRole("student");

      navigate(`/student/entry/${examId}?code=${encodeURIComponent(cleanExamCode)}`);
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message || "Нэвтрэх үед алдаа гарлаа.");
    } finally {
      setSubmitting(false);
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
              Шалгалтад орохын тулд овог нэр, оюутны код болон багшаас өгсөн
              шалгалтын нууц үгийг оруулна уу.
            </p>
          </div>
          <button className="secondary" onClick={load}>
            Одоо шалгах
          </button>
        </div>

        <form className="code-access-box" onSubmit={submitCode}>
          <div>
            <strong>Шалгалтын мэдээлэл</strong>
            <p className="muted">
              Нууц үгийг зөв оруулбал та шалгалтын заавар эсвэл хүлээлгийн өрөө рүү орно.
              Нууц үгийг зөвхөн багшаас авна.
            </p>
          </div>

          <label className="field-label">
            Овог нэр
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Жишээ: Бат-Эрдэнэ Дорж"
              autoComplete="name"
            />
          </label>

          <label className="field-label">
            Оюутны код / сурагчийн дугаар
            <input
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              placeholder="Жишээ: B222270089"
              autoComplete="off"
            />
          </label>

          <label className="field-label">
            Шалгалтын нууц үг
            <input
              value={examCode}
              onChange={(event) => setExamCode(event.target.value)}
              placeholder="Багшаас авсан нууц үг"
              autoComplete="off"
            />
          </label>

          <button disabled={submitting || !studentName.trim() || !studentCode.trim() || !examCode.trim()}>
            {submitting ? "Шалгаж байна..." : "Шалгалтад орох"}
          </button>
        </form>

        {error && <ErrorBox message={error} />}

        {exams.length === 0 ? (
          <EmptyState
            title="Шалгалтын мэдээллээ оруулна уу"
            text="Хэрэв та нэвтэрч чадахгүй бол багшдаа хандана уу."
          />
        ) : (
          <div className="exam-list-grid">
            {exams.map((exam) => {
              const examId = exam.id || exam._id;

              return (
                <article key={examId} className="exam-list-card">
                  <div className="exam-list-card-head">
                    <div>
                      <h2>{exam.title}</h2>
                      <p>{exam.subject || "Ерөнхий шалгалт"}</p>
                    </div>
                    <span className={`status ${exam.sessionStatus || exam.status}`}>
                      {exam.status === "open" ? "Нээлттэй" : "Хүлээгдэж байна"}
                    </span>
                  </div>

                  <div className="mini-stats">
                    <span>{exam.totalQuestions} асуулт</span>
                    <span>{exam.perQuestionTimeSeconds} сек / асуулт</span>
                    <span>30 оноонд шилжинэ</span>
                  </div>

                  <button onClick={() => navigate(`/student/entry/${examId}`)}>
                    Шалгалт руу орох
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
