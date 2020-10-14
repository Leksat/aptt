import React, { useState } from 'react';
import { parseEntries, stringifyEntries } from '../shared/entries';
import { getState, setState } from './state';

const App = (): JSX.Element => {
  const [error, setError] = useState('');

  const onTextChange = (text: string): void => {
    const parsed = parseEntries(text);
    if (typeof parsed === 'string') {
      setError(parsed);
    } else {
      setError('');
      setState('entries', parsed);
    }
  };

  return (
    <>
      <textarea
        rows={10}
        onChange={(event) => onTextChange(event.target.value)}
        defaultValue={stringifyEntries(getState('entries'))}
      />
      {error && <div>{error}</div>}
    </>
  );
};

export default App;
