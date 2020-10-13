import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  Menu,
  Tray,
} from 'electron';
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow: BrowserWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
    },
    skipTaskbar: true,
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();

  setTimeout(() => mainWindow.webContents.send('bob', 'okay'), 2000);
});

let tray: Tray;
app.whenReady().then(() => {
  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = globalShortcut.register('CommandOrControl+Alt+V', () => {
    console.log('CommandOrControl+Alt+V is pressed');
    mainWindow.webContents.send('bob', 'CommandOrControl+Alt+V is pressed');
    mainWindow.webContents.send('bob', clipboard.readText('clipboard'));
  });

  if (!ret) {
    console.log('registration failed');
  }

  // Check whether a shortcut is registered.
  console.log('is reg:', globalShortcut.isRegistered('CommandOrControl+Alt+V'));

  let currentImage = 'assets/tray-idle.png';
  tray = new Tray(currentImage);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Item1', type: 'radio' },
    { label: 'Item2', type: 'radio' },
    { label: 'Item3', type: 'radio', checked: true },
    { label: 'Item4', type: 'radio' },
  ]);
  tray.setToolTip('This is my application.');
  tray.setTitle('bob!');
  tray.setContextMenu(contextMenu);
  setInterval(() => {
    currentImage =
      currentImage === 'assets/tray-idle.png'
        ? 'assets/tray-working.png'
        : 'assets/tray-idle.png';
    tray.setImage(currentImage);
  }, 3000);
});

app.on('window-all-closed', () => {
  // Empty handler is required to disable auto-exit.
});

app.dock.hide();
