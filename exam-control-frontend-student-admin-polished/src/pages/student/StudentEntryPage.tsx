import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { devStudentLogin, codeStudentLogin, accessCheck, deviceCheck, teamsSsoLogin } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { Loading, ErrorBox } from "../../components/State";
import { detectDevice } from "../../utils/device";
import { useAuth } from "../../context/AuthContext";
import { tryGetTeamsSsoToken } from "../../utils/teamsSso";

export function StudentEntryPage() {
  const { examId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setRole } = useAuth();
  const [error, setError] = useState("");
  const [loadingText, setLoadingText] = useState("Нэвтрэх эрх шалгаж байна...");
  const [needsCode, setNeedsCode] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [code, setCode] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  async function ensureStudent() {
    if (localStorage.getItem("studentToken")) return;

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

    throw new Error("Teams account танигдсангүй. Багшаас өгсөн шалгалтын нууц үгээр орно уу.");
  }

  async function finishEntry(examCode?: string) {
    setLoadingText("Нэвтрэх эрх шалгаж байна...");
    const savedCode = examCode || localStorage.getItem(`examCode:${examId}`) || undefined;
    const access = await accessCheck(examId, savedCode);
    setExam(access.exam);
    if (!access.allowed) {
      setNeedsCode(true);
      setLoadingText("");
      return;
    }
    setLoadingText("Төхөөрөмжийн мэдээлэл бүртгэж байна...");
    if (savedCode) localStorage.setItem(`examCode:${examId}`, savedCode);
    await deviceCheck(examId, detectDevice());
    navigate(`/student/rules/${examId}`);
  }

  useEffect(() => {
    async function run() {
      try {
        await ensureStudent();
        const initialCode = searchParams.get("code") || localStorage.getItem(`examCode:${examId}`) || undefined;
        await finishEntry(initialCode);
      } catch (err) {
        setNeedsCode(true);
        setLoadingText("");
        setError("Нэвтрэх эрх баталгаажсангүй. Багшаас өгсөн шалгалтын нууц үгийг нэг удаа оруулна уу.");
      }
    }
    run();
  }, [examId]);

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setCheckingCode(true);
    setError("");
    try {
      if (!localStorage.getItem("studentToken")) {
        const login = await codeStudentLogin(code.trim());
        setRole("student");
        const targetExamId = login.exam?.id || login.exam?._id || examId;
        localStorage.setItem(`examCode:${targetExamId}`, code.trim());
        if (targetExamId !== examId) {
          navigate(`/student/entry/${targetExamId}?code=${encodeURIComponent(code.trim())}`);
          return;
        }
      }
      await finishEntry(code);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingCode(false);
    }
  }

  if (needsCode) {
    return (
      <div className="student-centered">
        <section className="exam-card narrow">
          <h1>Нэвтрэх эрх шалгах</h1>
          <p className="lead">Хэрэв таны Teams account автоматаар танигдаагүй бол багшаас өгсөн шалгалтын нууц үгийг нэг удаа оруулна.</p>
          <div className="penalty-box soft">
            Нууц үг амжилттай бол энэ хуудас дахин нууц үг асуухгүй. Local туршилтын нууц үг: <strong>CODE-60</strong>
          </div>
          {exam && <div className="summary-list"><div><span>Шалгалт</span><strong>{exam.title}</strong></div><div><span>Төлөв</span><strong>{exam.status || "-"}</strong></div></div>}
          {error && <ErrorBox message={error} />}
          <form className="question-form" onSubmit={submitCode}>
            <label>Шалгалтын нууц үг<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE-60" autoFocus /></label>
            <button disabled={!code.trim() || checkingCode}>{checkingCode ? "Шалгаж байна..." : "Нууц үгээр нэвтрэх"}</button>
          </form>
          <p className="muted">Нууц үг зөв бол та дүрмийн дэлгэц рүү орно. Нууц үг буруу бол шалгалт өгөх боломжгүй.</p>
        </section>
      </div>
    );
  }

  return <div className="student-centered">{error ? <ErrorBox message={error} /> : <Loading text={loadingText} />}</div>;
}
