import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";

export function AdminDetailedResultsPage() {
  const { examId } = useParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const { data } = await api.get(`/admin/reports/exams/${examId}/detailed`);
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [examId]);

  if (loading) return <Loading text="Дэлгэрэнгүй үр дүн уншиж байна..." />;

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Дэлгэрэнгүй үр дүн</h1>
          <p>Сурагч бүрийн өгсөн хариулт, зөв хариулт, оноог харуулна.</p>
        </div>
        <button onClick={load}>Шинэчлэх</button>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="stack">
        {sessions.map((session) => (
          <section className="panel" key={session.sessionId}>
            <h2>
              {session.student?.name || "Unknown"}{" "}
              <span className="muted">({session.student?.studentCode || "кодгүй"})</span>
            </h2>

            <div className="mini-stats">
              <span>Зөв: {session.correctCount} / {session.totalQuestions}</span>
              <span>Оноо: {session.rawScore}</span>
              <span>30 оноонд: {session.convertedScore}</span>
              <span>Төлөв: {session.status}</span>
              <span>Арга: {session.student?.accessMethod || "-"}</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Асуулт</th>
                    <th>Сурагчийн хариулт</th>
                    <th>Зөв хариулт</th>
                    <th>Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {session.answers.map((answer: any) => (
                    <tr key={`${session.sessionId}-${answer.number}`}>
                      <td>{answer.number}</td>
                      <td>{answer.questionText}</td>
                      <td>{answer.studentAnswer || "-"}</td>
                      <td>{answer.correctAnswer || "-"}</td>
                      <td>{answer.isCorrect ? "Зөв" : "Буруу"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
