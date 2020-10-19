import React, { useEffect, useRef, useState } from 'react';
import { parseEntries } from '../shared/entries';
import { store } from './store';
import { ipcRenderer } from 'electron';

const App = (): JSX.Element => {
  const [error, setError] = useState('');
  const [entries, setEntries] = useState(store.get('entries'));
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    store.updated('entries', (value) => {
      setEntries(value);
    });
  }, []);

  useEffect(() => {
    ipcRenderer.on('focusToTextarea', () => {
      if (textarea.current) {
        textarea.current.scrollTop = textarea.current.scrollHeight;
        textarea.current.setSelectionRange(
          textarea.current.value.length,
          textarea.current.value.length
        );
        textarea.current.focus();
      }
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
        ref={textarea}
      />
      {error && <div>{error}</div>}
    </>
  );
};

export default App;
