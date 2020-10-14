import { App, globalShortcut } from 'electron';
import { State } from '../shared/state';

export const registerShortcuts = (
  app: App,
  shortcuts: State['shortcuts']
): void => {
  const success = globalShortcut.register(shortcuts.newEntry, () => {
    // AXXX do magic
  });
  if (!success) {
    app.exit(1);
  }

  // AXXX shortcuts.displayWindow
};
