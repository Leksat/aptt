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
        store.set(
          'jira',
          {
            workerId: data.get('jira.workerId') as string,
            token: data.get('jira.token') as string,
          },
          { notify: false },
        );
        close();
      }}
    >
      <label>
        Jira Account ID
        <input name="jira.workerId" defaultValue={store.get('jira').workerId} />
        <a
          target="_blank"
          href="https://community.atlassian.com/t5/Jira-questions/how-to-find-accountid/qaq-p/1111436"
        >
          <small>Hpw to get it</small>
        </a>
      </label>
      <label>
        Tempo API token
        <input name="jira.token" defaultValue={store.get('jira').token} />
        <a
          target="_blank"
          href="https://tempo-io.atlassian.net/wiki/spaces/THC/pages/840531971/Using+REST+API+Integrations+-+Tempo+Cloud#UsingRESTAPIIntegrations-TempoCloud-CreatingaNewToken"
        >
          <small>Hpw to get it</small>
        </a>
      </label>
      <button onClick={close}>Close</button>
      <input type="submit" value="Save" />
    </form>
  );
};
