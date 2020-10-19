import moment from 'moment';
import { parseTicket } from './tickets';

interface Entry {
  start: string;
  description: string;
}

export const parseEntries = (text: string): Entry[] => {
  const entries: Entry[] = [];
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (trimmed.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        throw `Invalid time on line ${lineNumber}.`;
      }
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.start >= trimmed) {
        throw `The time on line ${lineNumber} should be bigger than the previous one.`;
      }
      entries.push({
        start: trimmed,
        description: '',
      });
    } else if (trimmed !== '') {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        throw `Found a description on line ${lineNumber}, but there is no start time defined.`;
      }
      if (lastEntry.description !== '') {
        throw `Found a description on line ${lineNumber}, but the description is already defined above.`;
      }
      lastEntry.description = trimmed;
    }
  }
  return entries;
};

export const now = (): string => moment().format('YYYY-MM-DD HH:mm');

export const addNewEntry = (args: {
  time: string;
  ticket: string;
  existingEntries: string;
}): string => {
  let entries;
  try {
    entries = parseEntries(args.existingEntries);
  } catch (e) {
    throw new Error('Current entries are not valid: ' + e.message);
  }

  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  if (lastEntry) {
    if (lastEntry.start === args.time) {
      throw new Error(
        'You are too fast! You already have a record for the current minute.'
      );
    }
    if (lastEntry.start > args.time) {
      throw new Error('Looks like your existing items are in the future O_o');
    }
  }

  if (lastEntry && args.ticket === parseTicket(lastEntry.description)) {
    throw new Error('You already tracking this ticket.');
  }

  return `${args.existingEntries.trimEnd()}
${args.time}
${args.ticket} `;
};
