import React, { useEffect, useState } from 'react';
import { parseEntries } from '../shared/entries';
import { state } from './state';

const App = (): JSX.Element => {
  const [error, setError] = useState('');
  const [entries, setEntries] = useState(state.get('entries'));
  useEffect(() => {
    state.updated('entries', (value) => {
      setEntries(value);
    });
  }, []);

  const onTextChange = (text: string): void => {
    setEntries(text);
    const result = parseEntries(text);
    if (result.kind === 'ok') {
      setError('');
      state.set('entries', text);
    } else {
      setError(result.error);
    }
  };

  return (
    <>
      <textarea
        rows={15}
        cols={50}
        onChange={(event) => onTextChange(event.target.value)}
        value={entries}
      />
      {error && <div>{error}</div>}
    </>
  );
};

export default App;
