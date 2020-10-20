import moment from 'moment';
import { parseTicket } from './tickets';
import { AppError } from './errors';

interface Entry {
  start: string;
  description: string;
}

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
    if (lastEntry.start === args.time) {
      throw new AppError(
        'You are too fast! You already have a record for the current minute.'
      );
    }
    if (lastEntry.start > args.time) {
      throw new AppError(
        'Looks like your existing items are in the future O_o'
      );
    }
  }

  const ticket = parseTicket(args.description);
  if (
    lastEntry &&
    ticket !== '' &&
    ticket === parseTicket(lastEntry.description)
  ) {
    throw new AppError('You already tracking this ticket.');
  }

  const trimmed = args.existingEntries.trimEnd();
  return ticket === args.description && args.description.trim() !== ''
    ? trimmed + '\n' + args.time + '\n' + ticket + ' '
    : trimmed + '\n' + args.time + '\n' + args.description;
};
