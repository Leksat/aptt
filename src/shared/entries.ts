import { Entry } from './state';

export const parseEntries = (text: string): Entry[] | string => {
  const entries: Entry[] = [];
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber++;
    const trimmed = line.trim();
    if (trimmed.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) {
        return `Invalid time on line ${lineNumber}.`;
      }
      const lastEntry = entries[entries.length - 1];
      if (lastEntry && lastEntry.start >= trimmed) {
        return `The time on line ${lineNumber} should be bigger than the previous one.`;
      }
      entries.push({
        start: trimmed,
        description: '',
      });
    } else if (trimmed !== '') {
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry) {
        return `Found a description on line ${lineNumber}, but there is no start time defined.`;
      }
      if (lastEntry.description !== '') {
        return `Found a description on line ${lineNumber}, but the description is already defined above.`;
      }
      lastEntry.description = trimmed;
    }
  }
  return entries;
};

export const stringifyEntries = (entries: Entry[]): string =>
  entries.map((entry) => entry.start + '\n' + entry.description).join('\n');
