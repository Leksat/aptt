import { parseEntries } from '../shared/entries';
import { parseTicket } from '../shared/tickets';
import { AppError } from '../shared/errors';
import { App } from '../shared/types';
import path from 'path';
import { Menu, Tray } from 'electron';

const getText = (
  entries: string
): {
  description: string;
  ticket: string;
} => {
  try {
    const parsed = parseEntries(entries);
    const lastEntry = parsed[parsed.length - 1];
    if (lastEntry) {
      return {
        description: lastEntry.description,
        ticket: parseTicket(lastEntry.description),
      };
    }
  } catch (e) {
    if (e instanceof AppError) {
      // No need to warn user here.
    } else {
      throw e;
    }
  }
  return {
    description: '',
    ticket: '',
  };
};

const initTray = (app: App): void => {
  const tray = new Tray(path.resolve(__dirname, 'assets/tray-idle.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click: () => app.electronApp.exit(),
    },
  ]);
  tray.setContextMenu(contextMenu);

  const onEntriesUpdate = (entries: string | undefined) => {
    const text = getText(entries || '');
    tray.setTitle(text.ticket);
  };
  app.store.onDidChange('entries', onEntriesUpdate);
  onEntriesUpdate(app.store.get('entries'));
};

const initBadge = (app: App): void => {
  const onEntriesUpdate = (entries: string | undefined) => {
    const text = getText(entries || '');
    app.electronApp.dock.setBadge(text.description ? '' : '▪️');
  };

  app.store.onDidChange('entries', onEntriesUpdate);
  onEntriesUpdate(app.store.get('entries'));
};

export const initIndicators = (app: App): void => {
  initTray(app);
  initBadge(app);
};
