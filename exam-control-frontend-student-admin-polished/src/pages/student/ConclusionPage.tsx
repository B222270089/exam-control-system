import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getConclusion } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { Loading, ErrorBox } from "../../components/State";
import { roundScore, formatDateTime } from "../../utils/format";
import type { ResultSummary } from "../../types";

export function ConclusionPage() {
  const { sessionId = "" } = useParams();
  const [result, setResult] = useState<ResultSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getConclusion(sessionId).then(setResult).catch((err) => setError(getErrorMessage(err)));
  }, [sessionId]);

  if (!result && !error) return <Loading />;

  return (
    <div className="student-centered">
      <section className="exam-card narrow success-card">
        <h1>Шалгалт амжилттай илгээгдлээ</h1>
        {error && <ErrorBox message={error} />}
        {result && (
          <div className="score-card realistic-result-card">
            <p className="muted center">Таны дүн зөвхөн нийт онооны хэлбэрээр харагдана. Зөв/буруу асуултын дэлгэрэнгүй, зөв хариултын түлхүүрийг харуулахгүй.</p>
            <div className="result-grid">
              <div>
                <span>Зөв хариултын тоо</span>
                <strong>{result.correctCount} / {result.totalQuestions}</strong>
              </div>
              <div>
                <span>Авсан оноо</span>
                <strong>{roundScore(result.rawScore)} / {roundScore(result.rawTotal)}</strong>
              </div>
              <div>
                <span>30 оноонд шилжүүлсэн дүн</span>
                <strong>{roundScore(result.convertedScore)} / {result.convertedTotal}</strong>
              </div>
              <div>
                <span>Төлөв</span>
                <strong>{result.status === "submitted" ? "Илгээгдсэн" : "Түр дүн / шалгах шаардлагатай"}</strong>
              </div>
            </div>
            <p className="muted center">Илгээсэн: {formatDateTime(result.submittedAt)}</p>
          </div>
        )}
        <div className="actions center-actions mt">
          <Link className="button-link" to="/student/exams">Миний шалгалтууд руу буцах</Link>
        </div>
      </section>
    </div>
  );
}
