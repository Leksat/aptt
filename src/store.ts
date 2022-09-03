import { appWindow } from '@tauri-apps/api/window';

export type Store = {
  entries: string;
  jira: {
    workerId: string;
    token: string;
  };
};

const defaults: Store = {
  entries: '',
  jira: {
    workerId: '',
    token: '',
  },
};

export type StoreChangedEvent = {
  [K in keyof Store]: {
    key: K;
    value: Store[K];
  };
}[keyof Store];

export const store = {
  get: <K extends keyof Store>(key: K): Store[K] =>
    JSON.parse(window.localStorage.getItem(key) || 'null') || defaults[key],
  set: <K extends keyof Store>(
    key: K,
    value: Store[K],
    options: { notify: boolean },
  ) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    if (options.notify) {
      appWindow.emit('store-changed', { key, value });
    }
  },
};
