import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptRules, accessCheck } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { ErrorBox, Loading } from "../../components/State";

export function RulesPage() {
  const { examId = "" } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const code = localStorage.getItem(`examCode:${examId}`) || undefined;
        const data = await accessCheck(examId, code);
        setExam(data.exam);
      } catch (err) { setError(getErrorMessage(err)); }
      finally { setLoading(false); }
    }
    load();
  }, [examId]);

  async function continueToWaiting() {
    setError("");
    try {
      const session = await acceptRules(examId);
      if (session.status === "submitted") return navigate(`/student/conclusion/${session.sessionId}`);
      if (String(session.status).includes("banned")) return navigate(`/student/banned/${session.sessionId}`);
      navigate(`/student/waiting/${examId}`);
    } catch (err) { setError(getErrorMessage(err)); }
  }

  if (loading) return <Loading text="Дүрэм ачаалж байна..." />;

  return (
    <div className="student-centered scrollable">
      <section className="exam-card rules-card">
        <h1>Шалгалтын дүрэм</h1>
        <p className="lead">Энэ шалгалтыг зөвхөн зөвшөөрөгдсөн Teams account-аар өгнө. Хэрэв account танигдахгүй бол багшаасаа шалгалтын нууц үг авч оруулна.</p>
        {exam && <div className="summary-list"><div><span>Шалгалт</span><strong>{exam.title}</strong></div><div><span>Асуулт</span><strong>{exam.totalQuestions}</strong></div><div><span>Хугацаа</span><strong>{exam.perQuestionTimeSeconds} сек / асуулт</strong></div></div>}
        {error && <ErrorBox message={error} />}
        <div className="rules-grid">
          <article className="rule"><h3>1. Нэг асуулт нэг удаа харагдана</h3><p>Хариултаа илгээсний дараа өмнөх асуулт руу буцах боломжгүй.</p></article>
          <article className="rule"><h3>2. Хүнд зөрчил</h3><p>Өөр tab, website, application руу шилжих, browser-оо minimize хийх, refresh/back хийх нь хүнд зөрчил болно. Жишээ: Google рүү шилжвэл тухайн асуулт 0 оноотой алгасна.</p></article>
          <article className="rule"><h3>3. Хөнгөн зөрчил</h3><p>Copy, paste, right click, text select, print/save shortcut зэрэг нь хөнгөн зөрчил болж бүртгэгдэнэ.</p></article>
          <article className="rule"><h3>4. Хүнд зөрчлийн шийтгэл</h3><p>Хүнд зөрчил гарвал одоогийн асуулт 0 оноотой алгасна. 4 дэх хүнд зөрчил дээр шалгалт түгжигдэнэ.</p></article>
          <article className="rule"><h3>5. Утас ашиглаж байгаа бол</h3><p>Өөр app руу шилжих, notification дарж шалгалтаас гарах, дэлгэц түгжих нь хүнд зөрчилд тооцогдоно. Keyboard гарах нь зөрчил биш.</p></article>
          <article className="rule"><h3>6. Хугацаа дуусах</h3><p>Хугацаа дуусвал тухайн асуулт 0 оноотой болно. Энэ нь зөрчил биш.</p></article>
          <article className="rule"><h3>7. Нэг account — нэг төхөөрөмж</h3><p>Нэг account-аар нэг шалгалтыг хоёр төхөөрөмж дээр зэрэг эхлүүлэх боломжгүй.</p></article>
          <article className="rule"><h3>8. Дахин өгөх эрх</h3><p>Шалгалтаа илгээсэн эсвэл түгжигдсэн бол дахин эхлүүлэх боломжгүй. Зөвхөн багш админы хэсгээс дахин өгөх эрх өгч болно.</p></article>
        </div>
        <div className="penalty-box soft"><strong>Санамж:</strong> Шалгалтын явцад зөвхөн энэ хуудсан дээр байж, дараагийн асуулт руу шилжихээс өмнө хариултаа шалгана уу.</div>
        <label className="checkline"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> Би дүрмийг уншиж, ойлгож, зөвшөөрч байна.</label>
        <button disabled={!checked} onClick={continueToWaiting}>Үргэлжлүүлэх</button>
      </section>
    </div>
  );
}
