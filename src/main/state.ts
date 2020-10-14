import Store from 'electron-store';
import { State } from '../shared/state';
import { ipcMain } from 'electron';

export const state = new Store<State>({
  defaults: {
    entries: [],
    jira: {
      url: '',
      username: '',
      password: '',
    },
    window: {
      height: 600,
      width: 800,
    },
    shortcuts: {
      newEntry: 'CommandOrControl+Alt+V',
      displayWindow: 'CommandOrControl+Alt+X',
    },
  },
});

ipcMain.on('setState', (event, ...data) => {
  const key = data[0] as keyof State;
  const value = data[1] as State[typeof key];
  state.set(key, value);
});

ipcMain.on('getState', (event, key: keyof State) => {
  event.returnValue = state.get(key);
});
