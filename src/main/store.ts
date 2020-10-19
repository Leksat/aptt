import Store from 'electron-store';
import { defaults, State } from '../shared/state';
import { ipcMain } from 'electron';
import { App } from '../shared/types';

export const store = new Store<State>({ defaults });

ipcMain.on('setState', (event, ...data) => {
  const key = data[0] as keyof State;
  const value = data[1] as State[typeof key];
  store.set(key, value);
});

ipcMain.on('getState', (event, key: keyof State) => {
  event.returnValue = store.get(key);
});

export const connectStore = (app: App): void => {
  for (const _key of Object.keys(defaults)) {
    const key = _key as keyof State;
    store.onDidChange(key, (value) => {
      app.window.webContents.send('stateUpdated', key, value);
    });
  }
};
