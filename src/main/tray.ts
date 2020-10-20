import { Menu, Tray } from 'electron';
import { App } from '../shared/types';
import { parseEntries } from '../shared/entries';
import { AppError } from '../shared/errors';
import { parseTicket } from '../shared/tickets';

const trayImageIdle = 'assets/tray-idle.png';
const trayImageWorking = 'assets/tray-working.png';

export const createTray = (app: App): void => {
  const tray = new Tray(trayImageIdle);
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
  tray.setContextMenu(contextMenu);

  const getTrayText = (entries: string): string => {
    try {
      const parsed = parseEntries(entries);
      const lastEntry = parsed[parsed.length - 1];
      if (lastEntry) {
        const ticket = parseTicket(lastEntry.description);
        if (ticket !== '') {
          return ticket;
        }
      }
    } catch (e) {
      if (e instanceof AppError) {
        // No need to warn user here.
      } else {
        throw e;
      }
    }
    return '';
  };
  const onEntriesUpdate = (entries: string | undefined) => {
    const text = getTrayText(entries || '');
    tray.setTitle(text);
    tray.setImage(text === '' ? trayImageIdle : trayImageWorking);
  };
  app.store.onDidChange('entries', onEntriesUpdate);
  onEntriesUpdate(app.store.get('entries'));
};
