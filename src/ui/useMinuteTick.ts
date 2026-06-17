import { useEffect, useState } from "react";

export const useMinuteTick = (): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeoutId: number;
    const scheduleNextMinute = () => {
      const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextMinute();
      }, msUntilNextMinute);
    };
    scheduleNextMinute();
    return () => window.clearTimeout(timeoutId);
  }, []);
  return now;
};
