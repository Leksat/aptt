import { appWindow } from '@tauri-apps/api/window';

import { defaultNotes } from '../components/Notes';

export type Store = {
  entries: string;
  jira: {
    workerId: string;
    token: string;
  };
  history: Array<{
    time: string;
    entries: string;
  }>;
  notes: string;
};

const defaults: Store = {
  entries: '',
  jira: {
    workerId: '',
    token: '',
  },
  history: [],
  notes: defaultNotes,
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
  set: <K extends keyof Store>(key: K, value: Store[K]) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    appWindow.emit('store-changed', { key, value });
  },
  // For tests.
  clear: () => window.localStorage.clear(),
};
