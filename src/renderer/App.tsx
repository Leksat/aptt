import React, { useEffect, useState } from 'react';
import { parseEntries } from '../shared/entries';
import { store } from './store';

const App = (): JSX.Element => {
  const [error, setError] = useState('');
  const [entries, setEntries] = useState(store.get('entries'));
  useEffect(() => {
    store.updated('entries', (value) => {
      setEntries(value);
    });
  }, []);

  const onTextChange = (text: string): void => {
    setEntries(text);
    try {
      parseEntries(text);
      setError('');
      store.set('entries', text);
    } catch (e) {
      setError(e.message);
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
