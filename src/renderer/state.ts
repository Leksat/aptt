import { State } from '../shared/state';
import { ipcRenderer } from 'electron';

export const setState = <Key extends keyof State>(
  key: Key,
  value: State[Key]
): void => {
  ipcRenderer.send('setState', key, value);
};

export const getState = <Key extends keyof State>(key: Key): State[Key] => {
  return ipcRenderer.sendSync('getState', key);
};
