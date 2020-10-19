import { app as electronApp, BrowserWindow, dialog } from 'electron';
import { store } from './store';
import { getTicketFromClipboard } from '../shared/tickets';
import { addNewEntry, now } from '../shared/entries';

export const app = {
  electronApp,
  window: {} as BrowserWindow,
  store,

  withErrorDialog: (callback: () => void): void => {
    try {
      callback();
    } catch (e) {
      dialog.showErrorBox('Whoops!', e.message);
    }
  },

  showWindow: (): void => app.window.show(),

  getTicketWithError: (): string => {
    const ticket = getTicketFromClipboard();
    if (ticket === '') {
      throw new Error('Cannot find a ticket number in the clipboard.');
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
};

export type App = typeof app;
