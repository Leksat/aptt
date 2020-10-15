import { App, BrowserWindow, Menu, Tray } from 'electron';
import Store from 'electron-store';
import { State } from '../shared/state';

let currentImage = 'assets/tray-idle.png';

export const createTray = (
  app: App,
  window: BrowserWindow,
  state: Store<State>
): void => {
  const tray = new Tray(currentImage);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show window',
      type: 'normal',
      click: () => {
        window.show();
      },
    },
    {
      label: 'New from clipboard',
      type: 'normal',
      click: () => {
        // AXXX create from clipboard
        state.set('entries', state.get('entries') + '\nok'); // AXXX del
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
