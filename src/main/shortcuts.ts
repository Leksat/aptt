import { globalShortcut } from 'electron';
import { App } from './app';

export const registerShortcuts = (app: App): void => {
  const success = globalShortcut.register(
    app.store.get('shortcuts').newEntry,
    () => {
      // AXXX do magic
    }
  );
  if (!success) {
    app.electronApp.exit(1);
  }

  // AXXX shortcuts.displayWindow
};
