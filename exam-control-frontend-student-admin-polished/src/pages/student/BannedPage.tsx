import { Link, useParams } from "react-router-dom";
export function BannedPage() {
  const { sessionId } = useParams();
  return <div className="student-centered"><section className="exam-card narrow danger-card"><h1>Шалгалт түгжигдлээ</h1><p>Та зөвшөөрөгдөх хэмжээнээс олон major violation гаргасан тул шалгалтаас хасагдлаа. Таны явц provisional байдлаар хадгалагдаж, админд илгээгдсэн.</p><p className="muted">Session: {sessionId}</p><Link className="button secondary" to="/">Нүүр хуудас</Link></section></div>;
}
