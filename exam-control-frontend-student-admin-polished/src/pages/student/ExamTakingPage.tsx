import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentQuestion, majorViolation, markQuestionDisplayed, minorViolation, submitAnswer, timeoutQuestion } from "../../api/student";
import { getErrorMessage } from "../../api/client";
import { QuestionRenderer } from "../../components/QuestionRenderer";
import { Loading, ErrorBox } from "../../components/State";
import { WarningModal } from "../../components/WarningModal";
import { Watermark } from "../../components/Watermark";
import { useServerCountdown } from "../../hooks/useServerCountdown";
import type { CurrentQuestionPayload } from "../../types";

const GRACE_MS = 1500;

export function ExamTakingPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<CurrentQuestionPayload | null>(null);
  const [answer, setAnswer] = useState<any>("");
  const [displayed, setDisplayed] = useState(false);
  const [serverDisplayedAt, setServerDisplayedAt] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);
  const violationLockRef = useRef(false);
  const pageReadyRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);

  async function loadQuestion() {
    setError("");
    setDisplayed(false);
    setAnswer("");
    const data = await getCurrentQuestion(sessionId);
    if (data.status === "submitted") {
      navigate(`/student/conclusion/${sessionId}`);
      return;
    }
    if (String(data.status).includes("banned")) {
      navigate(`/student/banned/${sessionId}`);
      return;
    }
    setPayload(data);
  }



  async function confirmQuestionDisplayed() {
    if (!payload || displayed) return;
    try {
      const response = await markQuestionDisplayed(sessionId);
      setServerDisplayedAt(response.displayedAt || null);
      setServerNow(response.serverNow || null);
      setDisplayed(true);
      pageReadyRef.current = true;
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    if (!payload) return;
    pageReadyRef.current = false;
    setDisplayed(false);
    if (!payload.question.mediaUrl) {
      const timer = window.setTimeout(() => { confirmQuestionDisplayed(); }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [payload?.question?._id, payload?.question?.id]);


  useEffect(() => {
    loadQuestion().catch((err) => setError(getErrorMessage(err)));
    return () => { pageReadyRef.current = false; };
  }, [sessionId]);

  const handleTimeout = useCallback(async () => {
    if (!payload || submitting) return;
    setSubmitting(true);
    try {
      const data = await timeoutQuestion(sessionId, payload?.question?._id || payload?.question?.id, payload?.questionNumber);
      if (data.status === "submitted") navigate(`/student/conclusion/${sessionId}`);
      else if (data.nextQuestion) {
        setWarning({ title: "Хугацаа дууслаа", message: "Энэ асуултын хугацаа дууссан тул 0 оноотой хадгалагдаж дараагийн асуулт руу шилжлээ. Энэ нь зөрчил биш." });
        setPayload(data.nextQuestion);
        setAnswer("");
        setDisplayed(false);
        setServerDisplayedAt(null);
        setServerNow(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [payload, sessionId, navigate, submitting]);

  const remaining = useServerCountdown(serverDisplayedAt, serverNow, payload?.question?.timeLimitSeconds || 0, Boolean(payload && displayed && !warning && !submitting), handleTimeout);

  async function submitCurrentAnswer() {
    if (!payload || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await submitAnswer(sessionId, answer, payload?.question?._id || payload?.question?.id, payload?.questionNumber);
      if (data.status === "submitted") navigate(`/student/conclusion/${sessionId}`);
      else if (data.nextQuestion) {
        setPayload(data.nextQuestion);
        setAnswer("");
        setDisplayed(false);
        setServerDisplayedAt(null);
        setServerNow(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const triggerMajorViolation = useCallback(async (type: string, details: any = {}) => {
    if (!pageReadyRef.current || violationLockRef.current || warning) return;
    violationLockRef.current = true;
    setSubmitting(true);
    try {
      const data = await majorViolation(sessionId, type, details);
      if (String(data.status).includes("banned")) {
        navigate(`/student/banned/${sessionId}`);
        return;
      }
      if (data.status === "submitted") {
        navigate(`/student/conclusion/${sessionId}`);
        return;
      }
      setWarning({ title: `АНХААРУУЛГА ${data.majorViolationCount}/3`, message: data.warningMessage || "Та шалгалтын хуудсаас гарсан тул одоогийн асуулт 0 оноотой алгаслаа." });
      if (data.nextQuestion) {
        setPayload(data.nextQuestion);
        setAnswer("");
        setDisplayed(false);
        setServerDisplayedAt(null);
        setServerNow(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
      window.setTimeout(() => { violationLockRef.current = false; }, 1500);
    }
  }, [sessionId, navigate, warning]);

  const triggerMinorViolation = useCallback(async (type: string, details: any = {}) => {
    if (!pageReadyRef.current || violationLockRef.current) return;
    try { await minorViolation(sessionId, type, details); } catch { /* warning-only; do not interrupt exam */ }
  }, [sessionId]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) hiddenAtRef.current = Date.now();
      else if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > GRACE_MS) {
        triggerMajorViolation("PAGE_HIDDEN_OR_TAB_SWITCH", { hiddenMs: Date.now() - hiddenAtRef.current });
        hiddenAtRef.current = null;
      }
    }
    function onBlur() {
      hiddenAtRef.current = Date.now();
      window.setTimeout(() => {
        if (document.hasFocus()) return;
        if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > GRACE_MS) {
          triggerMajorViolation("WINDOW_BLUR_OR_APP_SWITCH", { hiddenMs: Date.now() - hiddenAtRef.current });
        }
      }, GRACE_MS + 100);
    }
    function onFocus() { hiddenAtRef.current = null; }
    function onBeforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function onContextMenu(event: MouseEvent) { event.preventDefault(); triggerMinorViolation("RIGHT_CLICK_OR_LONG_PRESS"); }
    function onCopyPaste(event: ClipboardEvent) { event.preventDefault(); triggerMinorViolation(`${event.type.toUpperCase()}_ATTEMPT`); }
    function onDrag(event: DragEvent) { event.preventDefault(); triggerMinorViolation("DRAG_ATTEMPT"); }
    function onKeydown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      const blocked = (ctrlOrCmd && ["c", "v", "x", "a", "s", "p", "u", "f", "r"].includes(key)) ||
        event.key === "F12" ||
        (ctrlOrCmd && event.shiftKey && ["i", "j", "c", "k"].includes(key));
      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
        triggerMinorViolation("BLOCKED_SHORTCUT", { key: event.key, ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey });
      }
    }
    function onKeyup(event: KeyboardEvent) {
      if (event.key === "PrintScreen") triggerMinorViolation("PRINT_SCREEN_ATTEMPT");
    }
    function onOrientationChange() {
      triggerMinorViolation("ORIENTATION_CHANGE", { width: window.innerWidth, height: window.innerHeight });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("cut", onCopyPaste);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("keyup", onKeyup);
    window.addEventListener("orientationchange", onOrientationChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("cut", onCopyPaste);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("keyup", onKeyup);
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, [triggerMajorViolation, triggerMinorViolation]);

  async function closeWarning() {
    setWarning(null);
    if (payload) {
      try { const response = await markQuestionDisplayed(sessionId); setServerDisplayedAt(response.displayedAt || null); setServerNow(response.serverNow || null); setDisplayed(true); } catch { setDisplayed(true); }
    }
  }

  if (!payload && !error) return <Loading text="Асуулт ачаалж байна..." />;
  if (!payload) return <ErrorBox message={error || "Асуулт олдсонгүй."} />;

  const watermarkText = `Session ${sessionId.slice(-6)} • ${payload.questionNumber}/${payload.totalQuestions} • ${new Date().toLocaleTimeString("mn-MN", { hour12: false })}`;

  return (
    <div className="exam-mode">
      <Watermark text={watermarkText} />
      {warning && <WarningModal title={warning.title} message={warning.message} onContinue={closeWarning} danger />}
      <header className="exam-topbar">
        <div><strong>Асуулт {payload.questionNumber} / {payload.totalQuestions}</strong><span>{payload.question.type}</span></div>
        <div className={`timer ${remaining <= 10 ? "urgent" : ""}`}>{displayed ? `${remaining} сек` : "Ачаалж байна"}</div>
        <div className="violation-chip">Хүнд зөрчил: {payload.majorViolationCount || 0}/3</div>
      </header>
      <main className="exam-content" aria-live="polite">
        {error && <ErrorBox message={error} />}
        <section className="question-card active-question">
          <p className="instruction">{payload.question.instruction}</p>
          <h1>{payload.question.text}</h1>
          {payload.question.mediaUrl && <div className="media-frame"><img src={payload.question.mediaUrl} alt="Question media" draggable={false} onLoad={confirmQuestionDisplayed} onError={confirmQuestionDisplayed} /></div>}
          {!displayed ? <Loading text="Асуулт бүрэн ачаалж байна. Хугацаа асуулт бүрэн харагдсаны дараа эхэлнэ." /> : <QuestionRenderer question={payload.question} answer={answer} setAnswer={setAnswer} />}
        </section>
        <footer className="exam-footer"><button disabled={!displayed || submitting} onClick={submitCurrentAnswer}>{submitting ? "Хадгалж байна..." : payload.questionNumber === payload.totalQuestions ? "Шалгалт илгээх" : "Дараагийн асуулт"}</button></footer>
      </main>
    </div>
  );
}
