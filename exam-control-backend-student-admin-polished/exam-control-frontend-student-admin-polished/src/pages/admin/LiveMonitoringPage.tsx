import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { liveExam } from "../../api/admin";
import { SOCKET_URL, getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";
import { formatDateTime } from "../../utils/format";

export function LiveMonitoringPage() {
  const { examId = "" } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    try { setData(await liveExam(examId)); } catch (err) { setError(getErrorMessage(err)); }
  }

  useEffect(() => {
    load();
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.emit("join_exam_room", examId);
    socket.on("exam_status_changed", load);
    socket.on("student_session_started", load);
    const interval = window.setInterval(load, 5000);
    return () => { socket.disconnect(); window.clearInterval(interval); };
  }, [examId]);

  if (!data && !error) return <Loading />;

  const sessions = data?.sessions || [];
  return (
    <div className="page-stack">
      <section className="page-header"><div><h1>Live monitoring</h1><p>100 хүртэл сурагчийн явцыг хянах хэсэг.</p></div></section>
      {error && <ErrorBox message={error} />}
      <section className="panel">
        <div className="table-wrap"><table>
          <thead><tr><th>Сурагч</th><th>Төхөөрөмж</th><th>Асуулт</th><th>Major</th><th>Minor</th><th>Төлөв</th><th>Сүүлийн идэвх</th></tr></thead>
          <tbody>{sessions.map((s: any) => <tr key={s._id}>
            <td>{s.student?.displayName || s.studentId}<br /><span className="muted">{s.student?.email}</span></td>
            <td>{s.deviceType || "-"}<br /><span className="muted">{s.browser} / {s.operatingSystem}</span></td>
            <td>{Number(s.currentQuestionIndex || 0) + 1}</td>
            <td>{s.majorViolationCount || 0}/3</td>
            <td>{s.minorViolationCount || 0}</td>
            <td><span className={`status ${s.status}`}>{s.status}</span></td>
            <td>{formatDateTime(s.lastActivityAt)}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
