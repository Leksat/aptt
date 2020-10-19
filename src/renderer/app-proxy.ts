import { App, PickMethods } from '../shared/types';
import { ipcRenderer } from 'electron';

export const appProxy = new Proxy(
  {},
  {
    get(target, p) {
      return (...args: unknown[]) => {
        return ipcRenderer.sendSync(p as string, ...args);
      };
    },
  }
) as PickMethods<App>;
