import Store from 'electron-store';
import { defaults, State } from '../shared/state';
import { BrowserWindow, ipcMain } from 'electron';

export const state = new Store<State>({ defaults });

ipcMain.on('setState', (event, ...data) => {
  const key = data[0] as keyof State;
  const value = data[1] as State[typeof key];
  state.set(key, value);
});

ipcMain.on('getState', (event, key: keyof State) => {
  event.returnValue = state.get(key);
});

export const connectStore = (window: BrowserWindow): void => {
  for (const _key of Object.keys(defaults)) {
    const key = _key as keyof State;
    state.onDidChange(key, (value) => {
      window.webContents.send('stateUpdated', key, value);
    });
  }
};
