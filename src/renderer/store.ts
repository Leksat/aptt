import { State } from '../shared/state';
import { ipcRenderer } from 'electron';

const stateListeners: {
  [Key in keyof State]?: ((value: State[keyof State]) => void)[];
} = {};

export const store = {
  get: <Key extends keyof State>(key: Key): State[Key] => {
    return ipcRenderer.sendSync('getState', key);
  },

  set: <Key extends keyof State>(key: Key, value: State[Key]): void => {
    ipcRenderer.send('setState', key, value);
  },

  updated: <Key extends keyof State>(
    key: Key,
    listener: (value: State[Key]) => void
  ): void => {
    if (!stateListeners[key]) {
      stateListeners[key] = [];
    }
    stateListeners[key]?.push(listener as (value: State[keyof State]) => void);
  },
};

ipcRenderer.on('stateUpdated', (event, ...data) => {
  const key = data[0] as keyof State;
  const value = data[1] as State[typeof key];
  const listeners = stateListeners[key];
  if (listeners) {
    for (const listener of listeners) {
      listener(value);
    }
  }
});
