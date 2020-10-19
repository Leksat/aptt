import { Menu, Tray } from 'electron';
import { App } from './app';

let currentImage = 'assets/tray-idle.png';

export const createTray = (app: App): void => {
  const tray = new Tray(currentImage);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show window',
      click: () => app.showWindow(),
    },
    {
      label: 'New...',
      click: () => {
        app.withErrorDialog(() => {
          app.addNewEntry('');
        });
      },
    },
    {
      label: 'New from clipboard',
      click: () => {
        app.withErrorDialog(() => {
          const ticket = app.getTicketWithError();
          app.addNewEntry(ticket);
        });
      },
    },
    {
      label: 'New from clipboard...',
      click: () => {
        app.withErrorDialog(() => {
          const ticket = app.getTicketWithError();
          app.addNewEntry(ticket);
          app.showWindow();
        });
      },
    },
    {
      label: 'Quit',
      click: () => app.electronApp.exit(),
    },
  ]);

  // AXXX update
  tray.setToolTip('This is my application.');
  tray.setTitle('bob!');

  tray.setContextMenu(contextMenu);

  // AXXX del
  setInterval(() => {
    currentImage =
      currentImage === 'assets/tray-idle.png'
        ? 'assets/tray-working.png'
        : 'assets/tray-idle.png';
    tray.setImage(currentImage);
  }, 3000);
};
