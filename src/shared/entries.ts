import moment from 'moment';
import { parseTicket } from './tickets';
import { AppError } from './errors';

export interface Entry {
  start: string;
  description: string;
}

export interface JiraTimeEntry {
  // eslint-disable-next-line @typescript-eslint/ban-types
  attributes: {};
  billableSeconds: number;
  worker: string;
  comment: string;
  started: string; // e.g. "2020-10-20T06:01:00.000"
  timeSpentSeconds: number;
  originTaskId: string; // e.g. "123456" or "ABC-123"
  remainingEstimate: number;
  endDate: null;
  includeNonWorkingDays: false;
}

export const makeJiraTimeEntry = (args: {
  username: string;
  ticket: string;
  start: string;
  seconds: number;
  description: string;
}): JiraTimeEntry => ({
  attributes: {},
  billableSeconds: args.seconds,
  worker: args.username,
  comment: args.description,
  started: args.start.replace(' ', 'T') + ':00.000',
  timeSpentSeconds: args.seconds,
  originTaskId: args.ticket,
  remainingEstimate: 0,
  endDate: null,
  includeNonWorkingDays: false,
});

export const isTimeString = (text: string): boolean => {
  return !!text.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
};

export const parseEntries = (text: string): Entry[] => {
  const entries: Entry[] = [];
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (isTimeString(trimmed)) {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        throw new AppError(`Invalid time on line ${lineNumber}.`);
      }
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.start >= trimmed) {
        throw new AppError(
          `The time on line ${lineNumber} should be bigger than the previous one.`
        );
      }
      entries.push({
        start: trimmed,
        description: '',
      });
    } else if (trimmed !== '') {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        throw new AppError(
          `Found a description on line ${lineNumber}, but there is no start time defined.`
        );
      }
      if (lastEntry.description !== '') {
        throw new AppError(
          `Found a description on line ${lineNumber}, but the description is already defined above.`
        );
      }
      lastEntry.description = trimmed;
    }
  }
  return entries;
};

export const now = (): string => moment().format('YYYY-MM-DD HH:mm');

export const addNewEntry = (args: {
  time: string;
  description: string;
  existingEntries: string;
}): string => {
  let entries;
  try {
    entries = parseEntries(args.existingEntries);
  } catch (e) {
    throw new AppError('Current entries are not valid: ' + e.message);
  }

  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  if (lastEntry) {
    if (lastEntry.start > args.time) {
      throw new AppError(
        'Looks like your existing items are in the future O_o'
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
  const fromTime = new Date(from).getTime();
  if (isNaN(fromTime)) {
    throw new AppError(`Cannot parse "${from}".`);
  }

  if (!isTimeString(to)) {
    throw new AppError(`"${to}" is not a time string.`);
  }
  const toTime = new Date(to).getTime();
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
