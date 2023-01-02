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
    const parsed = parseEntries(entries);
    let current;
    while ((current = parsed.shift())) {
      const next = parsed[0] || {
        description: '',
        start: now,
      };

      const ticket = parseTicket(current.description);
      if (!ticket) {
        continue;
      }

      const seconds = diffInSeconds(current.start, next.start);

      if (!summary[ticket]) {
        summary[ticket] = 0;
      }
      summary[ticket] += seconds;

      const project = ticket.split('-')[0]!;
      if (!summaryByProject[project]) {
        summaryByProject[project] = 0;
      }
      summaryByProject[project] += seconds;
    }
    result =
      'By ticket:\n' +
      Object.entries(summary)
        .map(([ticket, seconds]) => ticket + ': ' + toHumanTime(seconds))
        .join('\n') +
      '\n\nBy project:\n' +
      Object.entries(summaryByProject)
        .map(([ticket, seconds]) => ticket + ': ' + toHumanTime(seconds))
        .join('\n') +
      '\n\nTotal: ' +
      toHumanTime(Object.values(summary).reduce((a, b) => a + b, 0));
  } catch (e) {
    result = '';
  }

  return (
    <pre className="summary" data-testid="summary">
      {result}
    </pre>
  );
};
