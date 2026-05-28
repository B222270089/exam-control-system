import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { examResults, exportResultsUrl, studentReport, resetStudentAttempt } from "../../api/admin";
import { getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";
import { roundScore, formatDateTime } from "../../utils/format";

export function ResultsPage() {
  const { examId = "" } = useParams();
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    try { setData(await examResults(examId)); } catch (err) { setError(getErrorMessage(err)); }
  }

  useEffect(() => { load(); }, [examId]);

  async function openDetail(studentId: string) {
    try { setDetail(await studentReport(examId, studentId)); } catch (err) { setError(getErrorMessage(err)); }
  }

  async function resetAttempt(studentId: string) {
    const ok = window.confirm("Энэ сурагчийн өмнөх оролдлого, оноо, зөрчлийн бүртгэлийг цэвэрлэж дахин шалгалт өгөх эрх олгох уу?");
    if (!ok) return;
    try {
      await resetStudentAttempt(examId, studentId, "Admin gave another chance");
      setDetail(null);
      await load();
    } catch (err) { setError(getErrorMessage(err)); }
  }

  if (!data && !error) return <Loading />;
  const results = data?.results || [];
  const avg = results.length ? results.reduce((s: number, r: any) => s + Number(r.convertedScore || 0), 0) / results.length : 0;

  return (
    <div className="page-stack">
      <section className="page-header"><div><h1>Үр дүн</h1><p>Сурагч зөвхөн score харна. Админ эндээс дэлгэрэнгүй тайлан, violation timeline, device/session мэдээллийг харна.</p></div><a className="button secondary" href={exportResultsUrl(examId)} target="_blank">Excel export</a></section>
      {error && <ErrorBox message={error} />}
      <section className="stats-grid"><article className="stat-card"><span>Илгээсэн</span><strong>{results.length}</strong></article><article className="stat-card"><span>Дундаж /30</span><strong>{roundScore(avg)}</strong></article><article className="stat-card"><span>Banned provisional</span><strong>{results.filter((r:any)=>r.status==='banned_provisional').length}</strong></article></section>
      <section className="panel">
        <div className="table-wrap"><table>
          <thead><tr><th>Сурагч</th><th>Raw score</th><th>30 оноо</th><th>Зөрчил</th><th>Төлөв</th><th>Илгээсэн</th><th>Үйлдэл</th></tr></thead>
          <tbody>{results.map((r: any) => {
            const student = r.studentId || r.student || {};
            const sid = student._id || r.studentId;
            return <tr key={r._id}>
              <td>{student.displayName || String(sid)}<br /><span className="muted">{student.email}</span></td>
              <td>{r.rawScore} / {r.rawTotal}</td>
              <td>{roundScore(r.convertedScore)} / {r.convertedTotal}</td>
              <td>{r.majorViolationCount || 0} major • {r.хөнгөнViolationCount || 0} хөнгөн</td>
              <td><span className={`status ${r.status}`}>{r.status}</span></td>
              <td>{formatDateTime(r.submittedAt)}</td>
              <td><div className="actions"><button className="secondary small" onClick={() => openDetail(String(sid))}>Дэлгэрэнгүй</button><button className="warning small" onClick={() => resetAttempt(String(sid))}>Дахин өгөх эрх</button></div></td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
      {detail && <section className="panel">
        <div className="page-header compact"><div><h2>Сурагчийн дэлгэрэнгүй тайлан</h2><p>{detail.student?.displayName} • {detail.student?.email}</p></div><button className="secondary" onClick={() => setDetail(null)}>Хаах</button></div>
        <div className="summary-list">
          <div><span>Session status</span><strong>{detail.session?.status}</strong></div>
          <div><span>Device</span><strong>{detail.session?.deviceType} / {detail.session?.browser} / {detail.session?.operatingSystem}</strong></div>
          <div><span>Score</span><strong>{detail.result ? `${detail.result.rawScore}/${detail.result.rawTotal} → ${roundScore(detail.result.convertedScore)}/${detail.result.convertedTotal}` : '-'}</strong></div>
          <div><span>Timeout</span><strong>{detail.result?.timeoutCount || 0}</strong></div>
          <div><span>Violation skipped</span><strong>{detail.result?.violationSkippedCount || 0}</strong></div>
        </div>
        <h3>Зөрчлийн түүх</h3>
        {detail.violations?.length ? <div className="question-list">{detail.violations.map((v:any)=><article className="question-row" key={v._id}><div><strong>{v.severity} — {v.type}</strong><p className="muted">{formatDateTime(v.timestamp)} • Action: {v.actionTaken}</p></div></article>)}</div> : <p className="muted">Зөрчил бүртгэгдээгүй.</p>}
      </section>}
    </div>
  );
}
