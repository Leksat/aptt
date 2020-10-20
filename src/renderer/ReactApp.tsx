import React, { useEffect, useRef, useState } from 'react';
import { isTimeString, parseEntries } from '../shared/entries';
import { store } from './store';
import { ipcRenderer } from 'electron';
import { appProxy } from './app-proxy';
import { AppError } from '../shared/errors';
import { Settings } from './Settings';

const ReactApp = (): JSX.Element => {
  const [error, setError] = useState('');
  const [entries, setEntries] = useState(store.get('entries'));
  const [settingsOpened, setSettingsOpened] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const getEntryUnderCursor = (): string => {
    if (!textarea.current) {
      throw new AppError('No textarea???');
    }
    const lineNr =
      textarea.current.value
        .substr(0, textarea.current.selectionStart)
        .split('\n').length - 1;
    const line = textarea.current.value.split('\n')[lineNr];
    if (isTimeString(line)) {
      throw new AppError(
        'The line under cursor is a time string. Cannot use it to start a new entry.'
      );
    }
    return line;
  };

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
      <div className="box">
        <div className="row max-height">
          <textarea
            onChange={(event) => onTextChange(event.target.value)}
            value={entries}
            ref={textarea}
          />
        </div>
        {error && <div className="row error">{error}</div>}
        <div className="row">
          <button
            onClick={() => {
              appProxy.addNewEntry('');
              appProxy.focusToTextarea();
            }}
          >
            New
          </button>
          <button
            onClick={() => {
              appProxy.addNewEntryFromClipboard();
              appProxy.focusToTextarea();
            }}
          >
            New from clipboard
          </button>
          <button
            onClick={() => {
              const line = getEntryUnderCursor();
              appProxy.addNewEntry(line);
              appProxy.focusToTextarea();
            }}
          >
            Start selected
          </button>
          <button
            onClick={() => {
              setSettingsOpened(true);
            }}
          >
            Settings
          </button>
        </div>
      </div>
      {settingsOpened && (
        <div className="settings-wrapper">
          <Settings close={() => setSettingsOpened(false)} />
        </div>
      )}
    </>
  );
};

export default ReactApp;
