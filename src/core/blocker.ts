import type { FindTicketId } from "./billable";
import type { TimeLog } from "./timeLog";

export interface Blocker {
  readonly line: number;
  readonly from: number;
  readonly to: number;
}

export const findAllBlockers = (
  log: TimeLog,
  text: string,
  findTicketId: FindTicketId,
): Blocker[] => {
  const lines = text.split("\n");
  const lineStarts = computeLineStarts(lines);
  const blockers: Blocker[] = [];
  const collect = (lineNumber: number): void => {
    const raw = lines[lineNumber - 1];
    if (raw === undefined) return;
    const col = blockerColumn(raw, findTicketId);
    if (col === null) return;
    const from = (lineStarts[lineNumber - 1] ?? 0) + col;
    blockers.push({ line: lineNumber, from, to: from + 1 });
  };
  for (let i = 0; i < log.closed.length; i++) {
    collect(2 * i + 2);
  }
  if (log.active !== null) {
    collect(2 * log.closed.length + 2);
  }
  return blockers;
};

export const findBlocker = (
  log: TimeLog,
  text: string,
  findTicketId: FindTicketId,
): Blocker | null => findAllBlockers(log, text, findTicketId)[0] ?? null;

const computeLineStarts = (lines: readonly string[]): number[] => {
  const starts: number[] = [0];
  for (let i = 0; i < lines.length - 1; i++) {
    const previous = starts[i] ?? 0;
    starts.push(previous + (lines[i] ?? "").length + 1);
  }
  return starts;
};

const blockerColumn = (rawLine: string, findTicketId: FindTicketId): number | null => {
  let i = skipWhitespace(rawLine, 0);
  if (i === rawLine.length) return null;
  const firstStart = i;
  i = skipNonWhitespace(rawLine, i);
  const first = rawLine.slice(firstStart, i);
  if (first === "!") return firstStart;
  if (findTicketId(first) === null) return null;
  i = skipWhitespace(rawLine, i);
  if (i === rawLine.length) return null;
  const secondStart = i;
  i = skipNonWhitespace(rawLine, i);
  const second = rawLine.slice(secondStart, i);
  if (second === "!") return secondStart;
  return null;
};

const skipWhitespace = (s: string, from: number): number => {
  let i = from;
  while (i < s.length && isWhitespace(s.charCodeAt(i))) i++;
  return i;
};

const skipNonWhitespace = (s: string, from: number): number => {
  let i = from;
  while (i < s.length && !isWhitespace(s.charCodeAt(i))) i++;
  return i;
};

const isWhitespace = (code: number): boolean =>
  code === 0x20 || code === 0x09 || code === 0x0b || code === 0x0c || code === 0x0d;
