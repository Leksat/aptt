import { Either } from "effect";

export interface ClosedTimeEntry {
  readonly start: Date;
  readonly end: Date;
  readonly description: string;
}

export interface ActiveTimeEntry {
  readonly start: Date;
  readonly description: string;
}

export interface TimeLog {
  readonly closed: readonly ClosedTimeEntry[];
  readonly active: ActiveTimeEntry | null;
}

export interface TimeLogParseError {
  readonly line: number;
  readonly message: string;
}

export const parseTimeLog = (text: string): Either.Either<TimeLog, TimeLogParseError> => {
  if (text === "") {
    return Either.right({ closed: [], active: null });
  }

  const lines = text.split("\n");
  const starts: Date[] = [];
  const descriptions: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    const isStartLine = i % 2 === 0;
    if (isStartLine) {
      const result = parseTimeEntryStart(line);
      if (Either.isLeft(result)) {
        return Either.left({ line: i + 1, message: result.left });
      }
      const previous = starts[starts.length - 1];
      if (previous !== undefined && result.right < previous) {
        return Either.left({ line: i + 1, message: "Negative duration is not allowed" });
      }
      if (previous !== undefined && result.right.getTime() === previous.getTime()) {
        return Either.left({ line: i + 1, message: "Zero duration is not allowed" });
      }
      starts.push(result.right);
    } else {
      descriptions.push(line);
    }
  }

  const closed: ClosedTimeEntry[] = [];
  for (let k = 0; k < starts.length - 1; k++) {
    const start = starts[k];
    const end = starts[k + 1];
    const description = descriptions[k];
    if (start === undefined || end === undefined || description === undefined) {
      throw new Error("unreachable: closed entry indexing");
    }
    closed.push({ start, end, description });
  }

  const active = buildActive(lines.length, starts, descriptions);

  return Either.right({ closed, active });
};

export const formatTimeLog = (log: TimeLog): string => {
  const lines: string[] = [];
  for (const entry of log.closed) {
    lines.push(formatStart(entry.start));
    lines.push(entry.description);
  }
  if (log.active !== null) {
    lines.push(formatStart(log.active.start));
    lines.push(log.active.description);
  }
  return lines.join("\n");
};

const TIME_ENTRY_START_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

const formatStart = (d: Date): string => {
  const year = d.getFullYear().toString().padStart(4, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const parseTimeEntryStart = (line: string): Either.Either<Date, string> => {
  const match = TIME_ENTRY_START_RE.exec(line);
  if (match === null) {
    return Either.left(`Expected a time entry start in format YYYY-MM-DD HH:MM, got: ${line}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour > 23) {
    return Either.left(`Hour must be 00-23, got ${match[4]}`);
  }
  if (minute > 59) {
    return Either.left(`Minute must be 00-59, got ${match[5]}`);
  }
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return Either.left(`${match[1]}-${match[2]}-${match[3]} is not a real date`);
  }
  return Either.right(date);
};

const buildActive = (
  lineCount: number,
  starts: readonly Date[],
  descriptions: readonly string[],
): ActiveTimeEntry | null => {
  const start = starts[starts.length - 1];
  if (start === undefined) return null;
  if (lineCount % 2 !== 0) {
    return { start, description: "" };
  }
  const description = descriptions[descriptions.length - 1];
  if (description === undefined) {
    throw new Error("unreachable: even line count guarantees a trailing description");
  }
  return { start, description };
};
