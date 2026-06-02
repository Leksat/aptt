import type { FindTargetId } from "./billable";
import type { TimeLog } from "./timeLog";

export interface Blocker {
  readonly line: number;
}

export const findBlocker = (log: TimeLog, findTargetId: FindTargetId): Blocker | null => {
  for (let i = 0; i < log.closed.length; i++) {
    const entry = log.closed[i];
    if (entry === undefined) continue;
    if (hasBlocker(entry.description, findTargetId)) {
      return { line: 2 * i + 2 };
    }
  }
  if (log.active !== null && hasBlocker(log.active.description, findTargetId)) {
    return { line: 2 * log.closed.length + 2 };
  }
  return null;
};

const hasBlocker = (description: string, findTargetId: FindTargetId): boolean => {
  const [first, second] = description.trim().split(/\s+/);
  if (first === undefined || first === "") return false;
  if (first === "!") return true;
  if (second === "!" && findTargetId(first) !== null) return true;
  return false;
};
