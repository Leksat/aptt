import { useEffect, useState } from "react";

export const useMinuteTick = (): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let intervalId: number | undefined;
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, msUntilNextMinute);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);
  return now;
};
