import { app as electronApp, BrowserWindow, dialog } from 'electron';
import { registerShortcuts } from './shortcuts';
import { connectStore } from './store';
import { app } from './app';
import { AppError } from '../shared/errors';
import { parseEntries } from '../shared/entries';
import { parseTicket } from '../shared/tickets';
import { initBadge } from './badge';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// From the boilerplate: Handle creating/removing shortcuts on Windows when
// installing/uninstalling.
if (require('electron-squirrel-startup')) electronApp.quit();

process.on('uncaughtException', function (e) {
  if (e instanceof AppError) {
    dialog.showErrorBox('Whoops!', e.message);
  } else {
    throw e;
  }
});

let shouldQuit = false;

electronApp.on('ready', () => {
  app.window = new BrowserWindow({
    height: app.store.get('window').height,
    width: app.store.get('window').width,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  app.window
    .loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .catch(() => electronApp.exit(1));

  app.window.on('close', (event) => {
    if (!shouldQuit) {
      event.preventDefault();
      app.electronApp.hide();
    }
  });

  connectStore(app);
});

electronApp.on('before-quit', () => {
  shouldQuit = true;
});

electronApp.whenReady().then(() => {
  registerShortcuts(app);
  initBadge(app);
});

electronApp.on('window-all-closed', () => {
  // Empty handler is required to disable auto-exit.
});
