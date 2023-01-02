import React from 'react';

import { diffInSeconds, parseEntries, toHumanTime } from '../lib/entries';
import { parseTicket } from '../lib/tickets';

interface Props {
  entries: string;
  now: string;
}

export const Summary: React.FC<Props> = ({ entries, now }) => {
  let result: string;
  try {
    type Ticket = string;
    type Seconds = number;
    const summary: Record<Ticket, Seconds> = {};
    type Project = string;
    const summaryByProject: Record<Project, Seconds> = {};
    const summaryByDescription: Record<string, Seconds> = {};
    const parsed = parseEntries(entries);
    let current;
    while ((current = parsed.shift())) {
      const next = parsed[0] || {
        description: '',
        start: now,
      };

      const ticket = parseTicket(current.description);

      const seconds = diffInSeconds(current.start, next.start);

      const key = ticket || '[other]';
      if (!summary[key]) {
        summary[key] = 0;
      }
      summary[key] += seconds;

      const project = ticket ? ticket.split('-')[0]! : '[other]';
      if (!summaryByProject[project]) {
        summaryByProject[project] = 0;
      }
      summaryByProject[project] += seconds;

      const description = current.description || '[no description]';
      if (!summaryByDescription[description]) {
        summaryByDescription[description] = 0;
      }
      summaryByDescription[description] += seconds;
    }
    result =
      'Total: ' +
      toHumanTime(Object.values(summary).reduce((a, b) => a + b, 0)) +
      '\n\nBy project:\n' +
      Object.entries(summaryByProject)
        .sort(([a], [b]) => sort(a, b))
        .map(([ticket, seconds]) => ticket + ': ' + toHumanTime(seconds))
        .join('\n') +
      '\n\nBy ticket:\n' +
      Object.entries(summary)
        .sort(([a], [b]) => sort(a, b))
        .map(([ticket, seconds]) => ticket + ': ' + toHumanTime(seconds))
        .join('\n') +
      '\n\nBy description:\n' +
      Object.entries(summaryByDescription)
        .sort(([a], [b]) => sort(a, b))
        .map(
          ([description, seconds]) => description + ': ' + toHumanTime(seconds),
        )
        .join('\n');
  } catch (e) {
    result = '';
  }

  return (
    <pre className="summary" data-testid="summary">
      {result}
    </pre>
  );
};

const sort = (a: string, b: string) =>
  a === '[other]' || a === '[no description]'
    ? 1
    : b === '[other]' || b === '[no description]'
    ? -1
    : a.localeCompare(b);
