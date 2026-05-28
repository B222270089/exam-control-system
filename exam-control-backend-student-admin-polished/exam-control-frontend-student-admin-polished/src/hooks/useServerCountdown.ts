import { useEffect, useRef, useState } from "react";

export function useServerCountdown(displayedAt: string | null | undefined, serverNow: string | null | undefined, seconds: number, active: boolean, onEnd: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!displayedAt || !serverNow || !seconds) {
      setRemaining(seconds || 0);
      endedRef.current = false;
      return;
    }
    const startMs = new Date(displayedAt).getTime();
    const serverNowMs = new Date(serverNow).getTime();
    const localNowMs = Date.now();
    const serverOffset = serverNowMs - localNowMs;
    function compute() {
      const adjustedNow = Date.now() + serverOffset;
      return Math.max(0, Math.ceil((startMs + seconds * 1000 - adjustedNow) / 1000));
    }
    setRemaining(compute());
    endedRef.current = false;
    if (!active) return;
    const interval = window.setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0 && !endedRef.current) {
        endedRef.current = true;
        window.setTimeout(onEnd, 0);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [displayedAt, serverNow, seconds, active, onEnd]);

  return remaining;
}
