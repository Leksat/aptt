import type { TimeLog } from "./timeLog";

export type FindTicketId = (text: string) => string | null;

export interface Billable {
  readonly ticketId: string;
  readonly tail: string;
}

export const parseBillable = (description: string, findTicketId: FindTicketId): Billable | null => {
  const trimmed = description.trim();
  if (trimmed === "") return null;
  const firstSpace = trimmed.search(/\s/);
  const firstToken = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const ticketId = findTicketId(firstToken);
  if (ticketId === null) return null;
  const tail = firstSpace === -1 ? "" : trimmed.slice(firstSpace).trim();
  return { ticketId, tail };
};

export const activeBillableTicketId = (log: TimeLog, findTicketId: FindTicketId): string | null => {
  if (log.active === null) return null;
  return parseBillable(log.active.description, findTicketId)?.ticketId ?? null;
};

const isBillable = (description: string, findTicketId: FindTicketId): boolean =>
  parseBillable(description, findTicketId) !== null;

export const closedBillableMinutes = (log: TimeLog, findTicketId: FindTicketId): number => {
  let minutes = 0;
  for (const entry of log.closed) {
    if (!isBillable(entry.description, findTicketId)) continue;
    minutes += diffMinutes(entry.start, entry.end);
  }
  return minutes;
};

export const totalBillableMinutes = (
  log: TimeLog,
  findTicketId: FindTicketId,
  now: Date,
): number => {
  let minutes = 0;
  for (const entry of log.closed) {
    if (!isBillable(entry.description, findTicketId)) continue;
    minutes += diffMinutes(entry.start, entry.end);
  }
  if (log.active !== null && isBillable(log.active.description, findTicketId)) {
    const end = floorToMinute(now);
    if (end.getTime() > log.active.start.getTime()) {
      minutes += diffMinutes(log.active.start, end);
    }
  }
  return minutes;
};

export const formatDurationShort = (minutes: number): string => {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  if (abs < 60) return `${sign}${abs}m`;
  const hours = Math.floor(abs / 60);
  const remaining = abs % 60;
  if (remaining === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h${remaining}m`;
};

export interface LineDuration {
  readonly line: number;
  readonly minutes: number;
}

export const lineDurations = (log: TimeLog, now: Date): LineDuration[] => {
  const result: LineDuration[] = [];
  for (let i = 0; i < log.closed.length; i++) {
    const entry = log.closed[i];
    if (entry === undefined) continue;
    result.push({ line: 2 * i + 1, minutes: diffMinutes(entry.start, entry.end) });
  }
  if (log.active !== null) {
    const line = 2 * log.closed.length + 1;
    result.push({ line, minutes: diffMinutes(log.active.start, floorToMinute(now)) });
  }
  return result;
};

const diffMinutes = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / 60_000);

const floorToMinute = (d: Date): Date => {
  const result = new Date(d);
  result.setSeconds(0, 0);
  return result;
};
