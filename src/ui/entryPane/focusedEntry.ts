import type { ActiveTimeEntry, ClosedTimeEntry, TimeLog } from "../../core/timeLog";

export type FocusedEntry =
  | { readonly kind: "closed"; readonly entry: ClosedTimeEntry }
  | { readonly kind: "active"; readonly entry: ActiveTimeEntry };

export const entryAtStartLine = (log: TimeLog, line: number): FocusedEntry | null => {
  if (line < 1 || line % 2 !== 1) return null;
  const index = (line - 1) / 2;
  if (index < log.closed.length) {
    const entry = log.closed[index];
    if (entry === undefined) return null;
    return { kind: "closed", entry };
  }
  if (index === log.closed.length && log.active !== null) {
    return { kind: "active", entry: log.active };
  }
  return null;
};
