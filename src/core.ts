import { store, StoreChangedEvent } from './store';
import { getTicketFromClipboard, parseTicket } from './tickets';
import {
  addNewEntry,
  diffInSeconds,
  Entry,
  makeJiraTimeEntry,
  now,
  parseEntries,
  stringifyEntries,
} from './entries';
import { AppError } from './errors';
import { appWindow } from '@tauri-apps/api/window';
import { message } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { globalShortcut } from '@tauri-apps/api';
import { Body, fetch } from '@tauri-apps/api/http';

export const init = async () => {
  await listen('clipboard-hotkey', () => {
    core.addNewEntryFromClipboard();
  });

  await globalShortcut.register('Command+Alt+X', core.focusWindow);

  const setTrayText = (entries: string) => {
    const entry = parseEntries(entries).at(-1);
    const ticket = entry?.description ? parseTicket(entry.description) : '';
    appWindow.emit('set-text', ticket ? '🕒 ' + ticket : '🕒');
  };
  setTrayText(store.get('entries'));
  await appWindow.listen('store-changed', (event) => {
    const data = JSON.parse(event.payload as string) as StoreChangedEvent;
    if (data.key === 'entries') {
      setTrayText(data.value);
    }
  });
};

export const core = {
  focusWindow: async (): Promise<void> => {
    await appWindow.setFocus();
    await core.focusToTextarea();
  },

  getTicketWithError: async (): Promise<string> => {
    const ticket = await getTicketFromClipboard();
    if (ticket === '') {
      throw new AppError('Cannot find a ticket number in the clipboard.');
    }
    return ticket;
  },

  addNewEntry: (description: string): void => {
    const updatedEntries = addNewEntry({
      time: now(),
      description,
      existingEntries: store.get('entries'),
    });
    store.set('entries', updatedEntries);
  },

  addNewEntryFromClipboard: async (): Promise<void> => {
    const ticket = await core.getTicketWithError();
    core.addNewEntry(ticket);
  },

  focusToTextarea: async (): Promise<void> => {
    await appWindow.emit('focusToTextarea');
  },

  submit: async (): Promise<void> => {
    const entries = parseEntries(store.get('entries'));
    const initialAmount = entries.length - 1;
    let current;
    let error = false;
    while ((current = entries.shift())) {
      try {
        const next = entries[0] as Entry | undefined;
        if (!next) {
          // That's the current active item.
          entries.unshift(current);
          break;
        }

        await appWindow.emit(
          'submitting',
          `Submitted: ${
            100 - Math.round((entries.length * 100) / initialAmount)
          }%`,
        );

        const ticket = parseTicket(current.description);
        if (!ticket) {
          // Nothing to send to Jira.
          continue;
        }

        const seconds = diffInSeconds(current.start, next.start);

        // POST
        const url = 'https://api.tempo.io/core/3/worklogs';

        const data = makeJiraTimeEntry({
          workerId: store.get('jira').workerId,
          ticket,
          seconds,
          ...current,
        });

        await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + store.get('jira').token,
          },
          body: Body.json(data),
        });
      } catch (e) {
        entries.unshift(current);
        await message(`Error during submission: ${e}`, {
          type: 'error',
          title: 'Whoops!',
        });
        error = true;
        break;
      }
    }
    await appWindow.emit('submitting', `Submitted: ${error ? '???' : 100}%`);
    setTimeout(() => appWindow.emit('submitting', ''), 3000);
    store.set('entries', stringifyEntries(entries));
  },
};