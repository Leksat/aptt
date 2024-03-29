import { AppError } from './errors';
import { parseTicket } from './tickets';

export interface Entry {
  start: string;
  description: string;
}

export interface ParsedEntry extends Entry {
  startLineNumber: number;
}

export interface JiraTimeEntry {
  attributes: [];
  billableSeconds: number;
  authorAccountId: string;
  description: string;
  startDate: string; // e.g. "2020-10-20"
  startTime: string; // e.g. "06:01:00"
  timeSpentSeconds: number;
  issueKey: string; // e.g. "ABC-123"
}

export const makeJiraTimeEntry = (args: {
  workerId: string;
  ticket: string;
  start: string;
  seconds: number;
  description: string;
}): JiraTimeEntry => {
  const [date, time] = args.start.split(' ');
  return {
    attributes: [],
    billableSeconds: args.seconds,
    authorAccountId: args.workerId,
    description: args.description.replace(args.ticket, '').trim(),
    startDate: date!,
    startTime: time + ':00',
    timeSpentSeconds: args.seconds,
    issueKey: args.ticket,
  };
};

export const isTimeString = (text: string): boolean => {
  return !!text.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
};

export const parseEntries = (text: string): ParsedEntry[] => {
  const entries: ParsedEntry[] = [];
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (isTimeString(trimmed)) {
      const date = parseDate(trimmed);
      if (isNaN(date.getTime())) {
        throw new AppError(`Invalid time on line ${lineNumber}.`);
      }
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.start > trimmed) {
        throw new AppError(
          `The time on line ${lineNumber} should be bigger than the previous one.`,
        );
      }
      entries.push({
        start: trimmed,
        description: '',
        startLineNumber: lineNumber,
      });
    } else if (trimmed !== '') {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        throw new AppError(
          `Found a description on line ${lineNumber}, but there is no start time defined.`,
        );
      }
      if (lastEntry.description !== '') {
        throw new AppError(
          `Found a description on line ${lineNumber}, but the description is already defined above.`,
        );
      }
      lastEntry.description = trimmed;
    }
  }
  return entries;
};

export const now = (): string => formatDate(new Date());

export const addNewEntry = (args: {
  time: string;
  description: string;
  existingEntries: string;
}): string => {
  let entries: Entry[];
  try {
    entries = parseEntries(args.existingEntries);
  } catch (e) {
    throw new AppError(`Current entries are not valid: ${e}`);
  }

  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  if (lastEntry) {
    if (lastEntry.start > args.time) {
      throw new AppError(
        'Looks like your existing items are in the future O_o',
      );
    }
  }

  const ticket = parseTicket(args.description);

  entries.push({
    start: args.time,
    description: args.description,
  });
  return (
    stringifyEntries(entries) +
    (ticket === args.description && args.description.trim() !== '' ? ' ' : '')
  );
};

export const stringifyEntries = (entries: Entry[]): string =>
  entries.map((entry) => entry.start + '\n' + entry.description).join('\n');

export const diffInSeconds = (from: string, to: string): number => {
  if (!isTimeString(from)) {
    throw new AppError(`"${from}" is not a time string.`);
  }
  const fromTime = parseDate(from).getTime();
  if (isNaN(fromTime)) {
    throw new AppError(`Cannot parse "${from}".`);
  }

  if (!isTimeString(to)) {
    throw new AppError(`"${to}" is not a time string.`);
  }
  const toTime = parseDate(to).getTime();
  if (isNaN(toTime)) {
    throw new AppError(`Cannot parse "${to}".`);
  }

  return (toTime - fromTime) / 1000;
};

export const toHumanTime = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (h ? h + 'h' : '') + m + 'm';
};

export const parseDate = (date: string): Date =>
  new Date(date.replace(' ', 'T') + ':00');

export const formatDate = (date: Date): string =>
  date.getFullYear() +
  '-' +
  (date.getMonth() + 1).toString().padStart(2, '0') +
  '-' +
  date.getDate().toString().padStart(2, '0') +
  ' ' +
  date.getHours().toString().padStart(2, '0') +
  ':' +
  date.getMinutes().toString().padStart(2, '0');
