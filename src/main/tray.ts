import { App, Menu, Tray } from 'electron';

let currentImage = 'assets/tray-idle.png';

export const createTray = (app: App, createWindow: () => void): void => {
  const tray = new Tray(currentImage);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show window',
      type: 'normal',
      click: () => {
        createWindow();
      },
    },
    {
      label: 'New from clipboard',
      type: 'normal',
      click: () => {
        // AXXX create from clipboard
      },
    },
    {
      label: 'New from clipboard...',
      type: 'normal',
      click: () => {
        // AXXX create from clipboard and display window
      },
    },
    {
      label: 'Quit',
      type: 'normal',
      click: () => app.exit(),
    },
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
};
