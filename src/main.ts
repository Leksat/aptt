import { app, BrowserWindow } from 'electron';
import { createTray } from './main/tray';
import { registerShortcuts } from './main/shortcuts';
import { connectStore, state } from './main/state';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// From the boilerplate: Handle creating/removing shortcuts on Windows when
// installing/uninstalling.
if (require('electron-squirrel-startup')) app.quit();

let window: BrowserWindow;
let shouldQuit = false;

app.on('ready', () => {
  window = new BrowserWindow({
    height: state.get('window').height,
    width: state.get('window').width,
    webPreferences: {
      nodeIntegration: true,
      // Required to make electron-store work in renderer process.
      enableRemoteModule: true,
    },
    skipTaskbar: true,
  });

  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch(() => app.exit(1));
  window.webContents.openDevTools();

  window.on('close', (event) => {
    if (!shouldQuit) {
      event.preventDefault();
      window.hide();
    }
  });

  connectStore(window);
});

app.on('before-quit', () => {
  shouldQuit = true;
});

app.whenReady().then(() => {
  registerShortcuts(app, state.get('shortcuts'));
  createTray(app, window, state);
});

app.on('window-all-closed', () => {
  // Empty handler is required to disable auto-exit.
});

// Electron.BrowserWindowConstructorOptions.skipTaskbar does not work on Mac.
app.dock.hide();
