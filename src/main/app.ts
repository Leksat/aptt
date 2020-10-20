import { app as electronApp, BrowserWindow, ipcMain } from 'electron';
import { store } from './store';
import { getTicketFromClipboard } from '../shared/tickets';
import { addNewEntry, now } from '../shared/entries';
import { AppError } from '../shared/errors';

export const app = {
  electronApp,
  window: {} as BrowserWindow,
  store,

  showWindow: (): void => {
    app.window.show();
    app.window.focus();
    app.focusToTextarea();
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
};

for (const key in app) {
  // @ts-ignore
  const method = app[key];
  if (typeof method === 'function') {
    ipcMain.on(key, (event, ...data) => {
      method(...data);
    });
  }
}
