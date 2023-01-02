import { useEffect, useRef, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { isTimeString, now as nowFunc, parseEntries } from '../lib/entries';
import { store, StoreChangedEvent } from '../lib/store';
import { AppError } from '../lib/errors';
import { Summary } from './Summary';
import { core, init } from '../lib/core';
import { Settings } from './Settings';
import { IntervalBasedCronScheduler, parseCronExpression } from 'cron-schedule';
import { ask, message } from '@tauri-apps/api/dialog';
import Egg from './Egg';

function App() {
  useEffect(() => {
    init();
  }, []);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState('');
  const [entries, setEntries] = useState(store.get('entries'));
  const [now, setNow] = useState(nowFunc());
  const [settingsOpened, setSettingsOpened] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const getEntryUnderCursor = (): string => {
    if (!textarea.current) {
      throw new AppError('No textarea???');
    }
    const lineNr =
      textarea.current.value
        .substring(0, textarea.current.selectionStart)
        .split('\n').length - 1;
    const line = textarea.current.value.split('\n')[lineNr];
    if (isTimeString(line)) {
      throw new AppError(
        'The line under cursor is a time string. Cannot use it to start a new entry.',
      );
    }
    return line;
  };

  useEffect(() => {
    appWindow.listen('store-changed', (event) => {
      const data = JSON.parse(event.payload as string) as StoreChangedEvent;
      if (data.key === 'entries') {
        setEntries(data.value);
      }
    });

    appWindow.listen('focusToTextarea', () => {
      if (textarea.current) {
        textarea.current.scrollTop = textarea.current.scrollHeight;
        textarea.current.setSelectionRange(
          textarea.current.value.length,
          textarea.current.value.length,
        );
        textarea.current.focus();
      }
    });

    appWindow.listen('submitting', (event) => {
      setSubmitting(event.payload as string);
    });

    appWindow.listen('displaySettings', () => {
      setSettingsOpened(true);
    });

    const scheduler = new IntervalBasedCronScheduler(1_000);
    scheduler.registerTask(parseCronExpression('* * * * *'), () => {
      setNow(nowFunc());
    });
    scheduler.stop();
    scheduler.start();
  }, []);

  const onTextChange = (text: string): void => {
    setEntries(text);
    try {
      parseEntries(text);
      setError('');
      store.set('entries', text);
    } catch (e) {
      setError(`${e}`);
    }
  };

  return (
    <>
      <div className="box">
        <div className="row max-height">
          <textarea
            data-testid="textarea"
            onChange={(event) => onTextChange(event.target.value)}
            value={entries}
            ref={textarea}
          />
          <Summary entries={entries} now={now} />
        </div>
        {error && <div className="row error">{error}</div>}
        {submitting && <div className="row submitting">{submitting}</div>}
        <div className="row">
          <button
            onClick={() => {
              core.addNewEntry('');
              core.focusToTextarea();
            }}
          >
            New/Stop
          </button>
          <button
            onClick={() => {
              const line = getEntryUnderCursor();
              core.addNewEntry(line);
              core.focusToTextarea();
            }}
          >
            New from selected
          </button>
          <button
            onClick={async () => {
              const entries = parseEntries(store.get('entries'));
              for (const entry of entries) {
                if (
                  entry.description.startsWith('!') ||
                  entry.description.match(/^[A-Z][A-Z0-9]*-\d+ !/)
                ) {
                  await message(
                    `There is an entry with a description starting with question mark:
"${entry.description}"
Please update it to continue.`,
                  );
                  return;
                }
              }
              if (await ask('Really?')) {
                await core.submit();
              }
            }}
          >
            Submit
          </button>
        </div>
      </div>
      {settingsOpened && (
        <div className="settings-wrapper" data-testid="settings">
          <Settings close={() => setSettingsOpened(false)} />
        </div>
      )}
      <Egg />
    </>
  );
}

export default App;
