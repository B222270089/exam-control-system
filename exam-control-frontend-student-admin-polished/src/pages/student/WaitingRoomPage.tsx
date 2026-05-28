import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { accessCheck, startExam } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { detectDevice } from "../../utils/device";
import { ErrorBox } from "../../components/State";

export function WaitingRoomPage() {
  const { examId = "" } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  async function load() {
    try {
      const savedCode = localStorage.getItem(`examCode:${examId}`) || undefined;
      const data = await accessCheck(examId, savedCode);
      setExam(data.exam);
      setStatus(data.examStatus);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, [examId]);

  async function onStart() {
    setStarting(true);
    setError("");
    try {
      const device = detectDevice();
      const examCode = localStorage.getItem(`examCode:${examId}`) || undefined;
      const data = await startExam(examId, { ...device, examCode });
      localStorage.setItem("currentSessionId", data.sessionId);
      if (data.status === "submitted") navigate(`/student/conclusion/${data.sessionId}`);
      else if (String(data.status).includes("banned")) navigate(`/student/banned/${data.sessionId}`);
      else navigate(`/student/exam/${data.sessionId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="student-centered">
      <section className="exam-card narrow">
        <h1>Хүлээлгийн өрөө</h1>
        {error && <ErrorBox message={error} />}
        <div className="summary-list">
          <div><span>Шалгалт</span><strong>{exam?.title || "-"}</strong></div>
          <div><span>Төлөв</span><strong>{status === "open" ? "Шалгалт нээлттэй" : "Багш эхлүүлэхийг хүлээж байна"}</strong></div>
          <div><span>Нийт асуулт</span><strong>{exam?.totalQuestions || "-"}</strong></div>
          <div><span>Асуулт бүрийн хугацаа</span><strong>{exam?.perQuestionTimeSeconds || "-"} сек</strong></div>
          <div><span>Хүнд зөрчил</span><strong>3 удаа хүртэл анхааруулга, 4 дэх дээр түгжинэ</strong></div>
        </div>
        {status === "open" ? <button disabled={starting} onClick={onStart}>{starting ? "Эхлүүлж байна..." : "Шалгалт эхлүүлэх"}</button> : <p className="muted center">Та шалгалтад холбогдсон байна. Багш эхлүүлэх хүртэл энэ хуудсан дээр хүлээнэ үү. Төлөв 5 секунд тутамд автоматаар шинэчлэгдэнэ.</p>}
      </section>
    </div>
  );
}
