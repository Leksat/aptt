import { app, BrowserWindow } from 'electron';
import { createTray } from './main/tray';
import { registerShortcuts } from './main/shortcuts';
import { state } from './main/state';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// From the boilerplate: Handle creating/removing shortcuts on Windows when
// installing/uninstalling.
if (require('electron-squirrel-startup')) app.quit();

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: state.get('window').height,
    width: state.get('window').width,
    webPreferences: {
      nodeIntegration: true,
    },
    skipTaskbar: true,
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY).catch(() => app.exit(1));
  mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.whenReady().then(() => {
  registerShortcuts(app, state.get('shortcuts'));
  createTray(app, createWindow);
});

app.on('window-all-closed', () => {
  // Empty handler is required to disable auto-exit.
});

// Electron.BrowserWindowConstructorOptions.skipTaskbar does not work on Mac.
app.dock.hide();
