import type { TimeLog } from "./timeLog";

export type FindTargetId = (text: string) => string | null;

export const activeBillableTargetId = (log: TimeLog, findTargetId: FindTargetId): string | null => {
  if (log.active === null) return null;
  return billableTargetId(log.active.description, findTargetId);
};

const isBillable = (description: string, findTargetId: FindTargetId): boolean =>
  billableTargetId(description, findTargetId) !== null;

const billableTargetId = (description: string, findTargetId: FindTargetId): string | null => {
  const firstToken = description.trim().split(/\s+/, 1)[0] ?? "";
  if (firstToken === "") return null;
  return findTargetId(firstToken);
};

export const closedBillableMinutes = (log: TimeLog, findTargetId: FindTargetId): number => {
  let minutes = 0;
  for (const entry of log.closed) {
    if (!isBillable(entry.description, findTargetId)) continue;
    minutes += diffMinutes(entry.start, entry.end);
  }
  return minutes;
};

export const totalBillableMinutes = (
  log: TimeLog,
  findTargetId: FindTargetId,
  now: Date,
): number => {
  let minutes = 0;
  for (const entry of log.closed) {
    if (!isBillable(entry.description, findTargetId)) continue;
    minutes += diffMinutes(entry.start, entry.end);
  }
  if (log.active !== null && isBillable(log.active.description, findTargetId)) {
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
