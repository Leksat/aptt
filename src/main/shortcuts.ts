import { globalShortcut } from 'electron';
import { App } from '../shared/types';

let lastHitNewEntry = 0;
const newEntryDelay = 1000;

export const registerShortcuts = (app: App): void => {
  if (
    !globalShortcut.register(app.store.get('shortcuts').newEntry, () => {
      const now = new Date().getTime();
      if (now - lastHitNewEntry > newEntryDelay) {
        const ticket = app.getTicketWithError();
        app.addNewEntry(ticket);
      } else {
        app.showWindow();
      }
      lastHitNewEntry = now;
    })
  ) {
    app.electronApp.exit(1);
  }

  if (
    !globalShortcut.register(app.store.get('shortcuts').displayWindow, () => {
      app.showWindow();
    })
  ) {
    app.electronApp.exit(1);
  }
};
