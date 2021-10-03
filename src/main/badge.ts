import { parseEntries } from '../shared/entries';
import { parseTicket } from '../shared/tickets';
import { AppError } from '../shared/errors';
import { App } from '../shared/types';

const getText = (entries: string): string => {
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

export const initBadge = (app: App): void => {
  const onEntriesUpdate = (entries: string | undefined) => {
    const text = getText(entries || '');
    app.electronApp.dock.setBadge(text);
  };

  app.store.onDidChange('entries', onEntriesUpdate);
  onEntriesUpdate(app.store.get('entries'));
};
