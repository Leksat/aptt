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
