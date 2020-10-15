import { App, BrowserWindow, dialog, Menu, Tray } from 'electron';
import Store from 'electron-store';
import { State } from '../shared/state';
import { getTicketFromClipboard, parseTicket } from '../shared/tickets';
import { now, parseEntries } from '../shared/entries';

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
        const entries = state.get('entries');
        const result = parseEntries(entries);
        if (result.kind === 'error') {
          dialog.showErrorBox(
            'Whoops!',
            'Current entries are not valid: ' + result.error
          );
          return;
        }

        const time = now();
        const lastEntry = result.entries.length
          ? result.entries[result.entries.length - 1]
          : null;
        if (lastEntry) {
          if (lastEntry.start === time) {
            dialog.showErrorBox(
              'Whoops!',
              'You are too fast! You already have a record for the current minute.'
            );
            return;
          }
          if (lastEntry.start > time) {
            dialog.showErrorBox(
              'Whoops!',
              'Looks like your existing items are in the future O_o'
            );
            return;
          }
        }

        const ticket = getTicketFromClipboard();
        if (ticket === '') {
          dialog.showErrorBox(
            'Whoops!',
            'Cannot find a ticket number in the clipboard.'
          );
          return;
        }
        if (lastEntry && ticket === parseTicket(lastEntry.description)) {
          dialog.showErrorBox('Whoops!', 'You already tracking this ticket.');
          return;
        }

        state.set(
          'entries',
          `${entries.trimEnd()}
${time}
${ticket} `
        );
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
