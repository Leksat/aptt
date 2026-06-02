import { useEffect } from "react";
import type { ThemeMode } from "../core/config";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const resolved = (mode: ThemeMode): "light" | "dark" => {
  if (mode === "system") return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  return mode;
};

export const useThemeApplication = (mode: ThemeMode): void => {
  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute("data-theme", resolved(mode));
    };
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);
};
