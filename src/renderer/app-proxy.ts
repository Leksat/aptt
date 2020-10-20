import { App, PickMethods, WithNoReturnValue } from '../shared/types';
import { ipcRenderer } from 'electron';

export const appProxy = new Proxy(
  {},
  {
    get(target, p) {
      return (...args: unknown[]) => {
        ipcRenderer.send(p as string, ...args);
      };
    },
  }
) as WithNoReturnValue<PickMethods<App>>;
