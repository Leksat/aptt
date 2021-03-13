import React from 'react';
import { store } from './store';

interface Props {
  close: () => void;
}

export const Settings: React.FC<Props> = ({ close }) => {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.target as HTMLFormElement);
        store.set('jira', {
          url: data.get('jira.url') as string,
          username: data.get('jira.username') as string,
          password: data.get('jira.password') as string,
        });
        store.set('shortcuts', {
          newEntry: data.get('shortcuts.newEntry') as string,
          toggleWindow: data.get('shortcuts.toggleWindow') as string,
        });
        close();
      }}
    >
      <label>
        Jira URL
        <input name="jira.url" defaultValue={store.get('jira').url} />
      </label>
      <label>
        Jira username
        <input name="jira.username" defaultValue={store.get('jira').username} />
      </label>
      <label>
        Jira password
        <input
          name="jira.password"
          defaultValue={store.get('jira').password}
          type="password"
        />
      </label>
      <label>
        Shortcut new entry
        <input
          name="shortcuts.newEntry"
          defaultValue={store.get('shortcuts').newEntry}
        />
      </label>
      <label>
        Shortcut toggle window
        <input
          name="shortcuts.toggleWindow"
          defaultValue={store.get('shortcuts').toggleWindow}
        />
      </label>
      <button onClick={close}>Close</button>
      <input type="submit" value="Save" />
    </form>
  );
};
