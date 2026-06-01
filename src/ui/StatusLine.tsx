import { formatDurationShort } from "../core/billable";
import type { Status } from "../core/status";
import { useStatus } from "./useStatus";

export const StatusLine = () => {
  const status = useStatus();
  return <div className={lineClass(status)}>{lineText(status)}</div>;
};

const lineClass = (status: Status): string =>
  status.tag === "parseError" ? "min-h-5 text-red-600 text-sm" : "min-h-5 text-gray-600 text-sm";

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
