import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { codeStudentLogin, listAvailableExams } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentName, setStudentName] = useState(localStorage.getItem("studentName") || "");
  const [studentCode, setStudentCode] = useState(localStorage.getItem("studentCode") || "");
  const [examCode, setExamCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeExam, setActiveExam] = useState<StudentExamCard | null>(null);

  async function load() {
    try {
      setError("");

      const token = localStorage.getItem("studentToken");

      if (!token) {
        setActiveExam(null);
        setLoading(false);
        return;
      }

      const data = await listAvailableExams();
      const allExams = Array.isArray(data) ? data : [];
      const activeExams = allExams.filter(isActiveExam);

      if (activeExams.length >= 1) {
        const exam = activeExams[0];
        setActiveExam(exam);

        if (activeExams.length === 1) {
          const examId = exam.id || exam._id;
          navigate(`/student/entry/${examId}`);
          return;
        }
      } else {
        setActiveExam(null);
      }
    } catch (err: any) {
      const message = getErrorMessage(err);

      if (
        err?.response?.status === 403 ||
        message.includes("Student not found") ||
        message.includes("Student access required") ||
        message.includes("Session not found")
      ) {
        localStorage.removeItem("studentToken");
        localStorage.removeItem("student");
        Object.keys(localStorage)
          .filter((key) => key.startsWith("examCode:"))
          .forEach((key) => localStorage.removeItem(key));
        setActiveExam(null);
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
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="student-centered">
        <Loading text="Шалгалтын хуудас бэлдэж байна..." />
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
              Овог нэр, оюутны код болон багшаас өгсөн шалгалтын нууц үгийг оруулна уу.
              Нууц үг зөв бол та шалгалтын заавар эсвэл хүлээлгийн өрөө рүү орно.
            </p>
          </div>
          <button className="secondary" onClick={load}>
            Шинэчлэх
          </button>
        </div>

        <div className="info-box soft">
          <strong>Анхаарах зүйл</strong>
          <p>
            Шалгалтын үеэр өөр tab, website, app руу шилжихгүй. Нэг асуулт нэг удаа гарна.
            Хугацаа дууссан асуулт 0 оноотой болно.
          </p>
        </div>

        <form className="code-access-box clean-entry" onSubmit={submitCode}>
          <div className="entry-intro">
            <strong>Шалгалтын мэдээлэл</strong>
            <p className="muted">
              Доорх мэдээллийг үнэн зөв бөглөнө үү. Оюутны кодоор таны үр дүн admin хэсэгт ялгагдана.
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

        {activeExam ? (
          <div className="simple-exam-note">
            <strong>Идэвхтэй шалгалт:</strong> {activeExam.title}
          </div>
        ) : (
          <div className="simple-exam-note">
            <strong>Идэвхтэй шалгалт:</strong> Багш шалгалтыг нээсэн үед нууц үгээр орно.
          </div>
        )}
      </section>
    </div>
  );
}
