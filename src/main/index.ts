import { app as electronApp, BrowserWindow } from 'electron';
import { createTray } from './tray';
import { registerShortcuts } from './shortcuts';
import { connectStore } from './store';
import { app } from './app';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// From the boilerplate: Handle creating/removing shortcuts on Windows when
// installing/uninstalling.
if (require('electron-squirrel-startup')) electronApp.quit();

let shouldQuit = false;

electronApp.on('ready', () => {
  app.window = new BrowserWindow({
    height: app.store.get('window').height,
    width: app.store.get('window').width,
    webPreferences: {
      nodeIntegration: true,
      // Required to make electron-store work in renderer process.
      enableRemoteModule: true,
    },
    skipTaskbar: true,
  });

  app.window
    .loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .catch(() => electronApp.exit(1));
  app.window.webContents.openDevTools();

  app.window.on('close', (event) => {
    if (!shouldQuit) {
      event.preventDefault();
      app.window.hide();
    }
  });

  connectStore(app);
});

electronApp.on('before-quit', () => {
  shouldQuit = true;
});

electronApp.whenReady().then(() => {
  registerShortcuts(app);
  createTray(app);
});

electronApp.on('window-all-closed', () => {
  // Empty handler is required to disable auto-exit.
});

// Electron.BrowserWindowConstructorOptions.skipTaskbar does not work on Mac.
electronApp.dock.hide();
