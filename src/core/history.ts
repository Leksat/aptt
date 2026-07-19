import type { SubmitResult } from "./submit";
import { formatTimeLog, type TimeLog } from "./timeLog";

export const carveHistory = (preSubmit: TimeLog, result: SubmitResult): string | null => {
  const carvedLength = preSubmit.closed.length - result.log.closed.length;
  if (carvedLength === 0) return null;
  const carved = preSubmit.closed.slice(0, carvedLength);
  const lastCarved = carved[carvedLength - 1];
  if (lastCarved === undefined) {
    throw new Error("unreachable: carvedLength > 0 implies a last carved entry");
  }
  return formatTimeLog({
    closed: carved,
    active: { start: lastCarved.end, description: "" },
  });
};

const HISTORY_FILENAME_RE = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})[+-]\d{4}\.txt$/;

export const parseHistoryFilename = (filename: string): Date | null => {
  const match = HISTORY_FILENAME_RE.exec(filename);
  if (match === null) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
};

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const relativeDay = (submittedAt: Date, now: Date): string | null => {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(submittedAt).getTime()) / 86_400_000,
  );
  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return `${days} days ago`;
  return null;
};

const pad = (value: number, width: number): string => value.toString().padStart(width, "0");

export const historyTitle = (submittedAt: Date, now: Date): string => {
  const date = `${pad(submittedAt.getFullYear(), 4)}-${pad(submittedAt.getMonth() + 1, 2)}-${pad(submittedAt.getDate(), 2)}`;
  const time = `${pad(submittedAt.getHours(), 2)}:${pad(submittedAt.getMinutes(), 2)}`;
  const relative = relativeDay(submittedAt, now);
  return relative === null ? `${date} ${time}` : `${relative}, ${date} ${time}`;
};

export const historyFilename = (now: Date): string => {
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  const second = now.getSeconds().toString().padStart(2, "0");
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const offsetH = Math.floor(absMin / 60)
    .toString()
    .padStart(2, "0");
  const offsetM = (absMin % 60).toString().padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}${sign}${offsetH}${offsetM}.txt`;
};
