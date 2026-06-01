import type { TimeLog } from "./timeLog";

export type ParseTargetId = (text: string) => string | null;

const isBillable = (description: string, parseTargetId: ParseTargetId): boolean => {
  const firstToken = description.trim().split(/\s+/, 1)[0] ?? "";
  if (firstToken === "") return false;
  return parseTargetId(firstToken) !== null;
};

export const totalBillableMinutes = (
  log: TimeLog,
  parseTargetId: ParseTargetId,
  now: Date,
): number => {
  let minutes = 0;
  for (const entry of log.closed) {
    if (!isBillable(entry.description, parseTargetId)) continue;
    minutes += diffMinutes(entry.start, entry.end);
  }
  if (log.active !== null && isBillable(log.active.description, parseTargetId)) {
    const end = floorToMinute(now);
    if (end.getTime() > log.active.start.getTime()) {
      minutes += diffMinutes(log.active.start, end);
    }
  }
  return minutes;
};

export const formatDurationShort = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining}m`;
};

const diffMinutes = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / 60_000);

const floorToMinute = (d: Date): Date => {
  const result = new Date(d);
  result.setSeconds(0, 0);
  return result;
};
