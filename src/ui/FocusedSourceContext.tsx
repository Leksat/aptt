import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export type FocusedSource = "timeLog" | "notes";

export interface FocusedSourceState {
  readonly source: FocusedSource;
  readonly caret: number;
}

interface FocusedSourceContextValue {
  readonly state: FocusedSourceState | null;
  readonly set: (state: FocusedSourceState | null) => void;
}

const FocusedSourceContext = createContext<FocusedSourceContextValue | null>(null);

export const FocusedSourceProvider = ({ children }: { children: ReactNode }) => {
  const [state, set] = useState<FocusedSourceState | null>(null);
  const value = useMemo(() => ({ state, set }), [state]);
  return <FocusedSourceContext value={value}>{children}</FocusedSourceContext>;
};

export const useFocusedSource = (): FocusedSourceContextValue => {
  const value = useContext(FocusedSourceContext);
  if (value === null) throw new Error("useFocusedSource: missing FocusedSourceProvider");
  return value;
};

export const caretOf = (el: HTMLTextAreaElement): number =>
  el.selectionDirection === "backward" ? el.selectionStart : el.selectionEnd;
