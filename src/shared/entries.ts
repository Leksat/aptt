import moment from 'moment';

interface Entry {
  start: string;
  description: string;
}

export const parseEntries = (
  text: string
): { kind: 'ok'; entries: Entry[] } | { kind: 'error'; error: string } => {
  const entries: Entry[] = [];
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (trimmed.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        return { kind: 'error', error: `Invalid time on line ${lineNumber}.` };
      }
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.start >= trimmed) {
        return {
          kind: 'error',
          error: `The time on line ${lineNumber} should be bigger than the previous one.`,
        };
      }
      entries.push({
        start: trimmed,
        description: '',
      });
    } else if (trimmed !== '') {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        return {
          kind: 'error',
          error: `Found a description on line ${lineNumber}, but there is no start time defined.`,
        };
      }
      if (lastEntry.description !== '') {
        return {
          kind: 'error',
          error: `Found a description on line ${lineNumber}, but the description is already defined above.`,
        };
      }
      lastEntry.description = trimmed;
    }
  }
  return { kind: 'ok', entries };
};

export const now = (): string => moment().format('YYYY-MM-DD HH:mm');
