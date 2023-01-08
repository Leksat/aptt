import React from 'react';

import { store } from '../lib/store';

export const History = () => (
  <pre className="summary">
    {store
      .get('history')
      .map((item) => 'Submitted ' + item.time + '\n\n' + item.entries)
      .join('\n\n')}
  </pre>
);
