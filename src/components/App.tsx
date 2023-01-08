import 'allotment/dist/style.css';
import 'react-tabs/style/react-tabs.css';

import { ask, message } from '@tauri-apps/api/dialog';
import { appWindow } from '@tauri-apps/api/window';
import { Allotment } from 'allotment';
import { IntervalBasedCronScheduler, parseCronExpression } from 'cron-schedule';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { RichTextarea, RichTextareaHandle } from 'rich-textarea';

import { core, init } from '../lib/core';
import {
  diffInSeconds,
  isTimeString,
  now as nowFunc,
  ParsedEntry,
  parseEntries,
  toHumanTime,
} from '../lib/entries';
import { AppError } from '../lib/errors';
import { store, StoreChangedEvent } from '../lib/store';
import Egg from './Egg';
import { History } from './History';
import { Settings } from './Settings';
import { Summary } from './Summary';

function App() {
  useEffect(() => {
    init();
  }, []);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState('');
  const [entries, setEntries] = useState(store.get('entries'));
  const [now, setNow] = useState(nowFunc());
  const [settingsOpened, setSettingsOpened] = useState(false);
  const textarea = useRef<RichTextareaHandle>(null);

  const getEntryUnderCursor = (): string => {
    if (!textarea.current) {
      throw new AppError('No textarea???');
    }
    const lineNr =
      textarea.current.value
        .substring(0, textarea.current.selectionStart)
        .split('\n').length - 1;
    const line = textarea.current.value.split('\n')[lineNr]!;
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
        textarea.current.scroll({ top: textarea.current.scrollHeight });
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

  const tabsStyle: CSSProperties = { flexGrow: 1, overflowY: 'scroll' };

  return (
    <>
      <div className="box">
        <div className="row max-height">
          <Allotment>
            <Allotment.Pane minSize={200}>
              <RichTextarea
                data-testid="textarea"
                onChange={(event) => onTextChange(event.target.value)}
                value={entries}
                ref={textarea}
                nonce=""
                style={{
                  height: '100%',
                  width: '100%',
                  padding: 0,
                  border: 0,
                  resize: 'none',
                }}
              >
                {(text) => {
                  let entries: ParsedEntry[];
                  try {
                    entries = parseEntries(text);
                  } catch (e) {
                    return text;
                  }
                  return text.split('\n').map((line, i) => {
                    const lineNumber = i + 1;
                    const entryIndex = entries.findIndex(
                      (entry) => entry.startLineNumber === lineNumber,
                    );
                    if (entryIndex === -1) {
                      const trimmed = line.trim();
                      return trimmed ? (
                        <div key={i}>{line}</div>
                      ) : (
                        <div key={i}>&nbsp;</div>
                      );
                    }
                    const entry = entries[entryIndex]!;
                    const nextEntryStart =
                      entries[entryIndex + 1]?.start || nowFunc();
                    const duration = diffInSeconds(entry.start, nextEntryStart);
                    return (
                      <div key={i}>
                        {line}{' '}
                        <span className="hint">{toHumanTime(duration)}</span>
                      </div>
                    );
                  });
                }}
              </RichTextarea>
            </Allotment.Pane>
            <Allotment.Pane snap>
              <Tabs
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <TabList>
                  <Tab>Summary</Tab>
                  <Tab>History</Tab>
                </TabList>
                <TabPanel style={tabsStyle}>
                  <Summary entries={entries} now={now} />
                </TabPanel>
                <TabPanel style={tabsStyle}>
                  <History />
                </TabPanel>
              </Tabs>
            </Allotment.Pane>
          </Allotment>
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
