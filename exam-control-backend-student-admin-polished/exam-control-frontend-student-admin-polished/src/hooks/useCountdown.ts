import { useEffect, useRef, useState } from "react";

export function useCountdown(seconds: number, active: boolean, onEnd: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const endedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    endedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (!endedRef.current) {
            endedRef.current = true;
            window.setTimeout(onEnd, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active, onEnd]);

  return remaining;
}
