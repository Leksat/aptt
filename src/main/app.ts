import { app as electronApp, BrowserWindow, dialog } from 'electron';
import { store } from './store';
import { getTicketFromClipboard } from '../shared/tickets';
import { addNewEntry, now } from '../shared/entries';
import { AppError } from '../shared/errors';

export const app = {
  electronApp,
  window: {} as BrowserWindow,
  store,

  withErrorDialog: (callback: () => void): void => {
    try {
      callback();
    } catch (e) {
      if (e instanceof AppError) {
        dialog.showErrorBox('Whoops!', e.message);
      } else {
        throw e;
      }
    }
  },

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

  addNewEntry: (ticket: string): void => {
    const updatedEntries = addNewEntry({
      time: now(),
      ticket,
      existingEntries: app.store.get('entries'),
    });
    app.store.set('entries', updatedEntries);
  },

  focusToTextarea: (): void => {
    app.window.webContents.send('focusToTextarea');
  },
};

export type App = typeof app;
