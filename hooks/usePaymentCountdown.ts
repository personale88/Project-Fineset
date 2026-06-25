"use client";

import { useEffect, useState } from "react";

export function usePaymentCountdown(
  active: boolean,
  durationSeconds: number,
  sessionKey: number,
): number {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [tracked, setTracked] = useState({
    sessionKey,
    durationSeconds,
    active,
  });

  if (
    tracked.sessionKey !== sessionKey ||
    tracked.durationSeconds !== durationSeconds ||
    tracked.active !== active
  ) {
    setTracked({ sessionKey, durationSeconds, active });
    if (
      !active ||
      tracked.sessionKey !== sessionKey ||
      tracked.durationSeconds !== durationSeconds
    ) {
      setSecondsLeft(durationSeconds);
    }
  }

  useEffect(() => {
    if (!active) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [active, durationSeconds, sessionKey]);

  return active ? secondsLeft : durationSeconds;
}
