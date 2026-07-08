import { getCurrentWindow } from "@tauri-apps/api/window";
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

    const resync = () => {
      window.clearTimeout(timeoutId);
      setNow(new Date());
      scheduleNextMinute();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    const unlistenPromise = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) resync();
    });

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
      void unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, []);
  return now;
};
