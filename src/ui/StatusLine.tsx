import { formatDurationShort } from "../core/billable";
import type { Status } from "../core/status";
import { useStatus } from "./useStatus";
import { useWeekProgress, type WeekProgress } from "./useWeekProgress";

export const StatusLine = () => {
  const status = useStatus();
  const week = useWeekProgress();
  return (
    <div className="flex min-h-5 items-baseline justify-between gap-4">
      <span className={leftClass(status)}>{lineText(status)}</span>
      {week !== null && <span className="text-[var(--color-muted)]">{weekText(week)}</span>}
    </div>
  );
};

const leftClass = (status: Status): string =>
  status.tag === "parseError" ? "text-[var(--color-attention)]" : "text-[var(--color-muted)]";

const lineText = (status: Status): string => {
  switch (status.tag) {
    case "submitting":
      return `Submitting ${status.current}/${status.total}…`;
    case "success":
      return `Submitted ${status.total} ${status.total === 1 ? "entry" : "entries"}`;
    case "parseError":
      return `Line ${status.line}: ${status.message}`;
    case "billable":
      return `Total billable: ${formatDurationShort(status.minutes)}`;
  }
};

const weekText = (week: WeekProgress): string => {
  if (week.tag === "cannotFetch") return "Week: cannot fetch";
  const required = formatDurationShort(week.requiredMinutes);
  if (week.billableMinutes === 0) {
    return `Week: ${formatDurationShort(week.loggedMinutes)} / ${required}`;
  }
  const sum = week.billableMinutes + week.loggedMinutes;
  return (
    `Week: ${formatDurationShort(week.billableMinutes)} + ${formatDurationShort(week.loggedMinutes)}` +
    ` = ${formatDurationShort(sum)} / ${required}`
  );
};
