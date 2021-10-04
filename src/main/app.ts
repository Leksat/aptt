import { app as electronApp, BrowserWindow, dialog, ipcMain } from 'electron';
import { store } from './store';
import { getTicketFromClipboard, parseTicket } from '../shared/tickets';
import {
  addNewEntry,
  diffInSeconds,
  Entry,
  makeJiraTimeEntry,
  now,
  parseEntries,
  stringifyEntries,
} from '../shared/entries';
import { AppError } from '../shared/errors';
import axios, { AxiosBasicCredentials } from 'axios';

export const app = {
  electronApp,
  window: {} as BrowserWindow,
  store,

  toggleWindow: (): void => {
    if (app.window.isFocused()) {
      app.electronApp.hide();
    } else {
      app.window.show();
      app.window.focus();
      app.focusToTextarea();
    }
  },

  getTicketWithError: (): string => {
    const ticket = getTicketFromClipboard();
    if (ticket === '') {
      throw new AppError('Cannot find a ticket number in the clipboard.');
    }
    return ticket;
  },

  addNewEntry: (description: string): void => {
    const updatedEntries = addNewEntry({
      time: now(),
      description,
      existingEntries: app.store.get('entries'),
    });
    app.store.set('entries', updatedEntries);
  },

  addNewEntryFromClipboard: (): void => {
    const ticket = app.getTicketWithError();
    app.addNewEntry(ticket);
  },

  focusToTextarea: (): void => {
    app.window.webContents.send('focusToTextarea');
  },

  submit: async (): Promise<void> => {
    const entries = parseEntries(store.get('entries'));
    const initialAmount = entries.length - 1;
    let current;
    let error = false;
    while ((current = entries.shift())) {
      try {
        const next = entries[0] as Entry | undefined;
        if (!next) {
          // That's the current active item.
          entries.unshift(current);
          break;
        }

        app.window.webContents.send(
          'submitting',
          `Submitted: ${
            100 - Math.round((entries.length * 100) / initialAmount)
          }%`
        );

        const ticket = parseTicket(current.description);
        if (!ticket) {
          // Nothing to send to Jira.
          continue;
        }

        const seconds = diffInSeconds(current.start, next.start);

        const url =
          store.get('jira').url.replace(/\/+$/, '') +
          '/rest/tempo-timesheets/4/worklogs/';

        const auth: AxiosBasicCredentials = {
          username: store.get('jira').username,
          password: store.get('jira').password,
        };

        const data = makeJiraTimeEntry({
          username: store.get('jira').username,
          ticket,
          seconds,
          ...current,
        });

        await axios.post(url, data, { auth });
      } catch (e) {
        entries.unshift(current);
        dialog.showErrorBox(
          'Whoops!',
          'Error during submission: ' + (e as Error).message
        );
        error = true;
        break;
      }
    }
    app.window.webContents.send(
      'submitting',
      `Submitted: ${error ? '???' : 100}%`
    );
    setTimeout(() => app.window.webContents.send('submitting', ''), 3000);
    store.set('entries', stringifyEntries(entries));
  },
};

for (const key in app) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const method = app[key];
  if (typeof method === 'function') {
    ipcMain.on(key, (event, ...data) => {
      method(...data);
    });
  }
}
