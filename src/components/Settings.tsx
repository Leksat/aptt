import React from 'react';

import { store } from '../lib/store';

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
          workerId: data.get('jira.workerId') as string,
          token: data.get('jira.token') as string,
        });
        close();
      }}
    >
      <label>
        Jira Account ID
        <input name="jira.workerId" defaultValue={store.get('jira').workerId} />
        <a
          target="_blank"
          href="https://community.atlassian.com/t5/Jira-questions/how-to-find-accountid/qaq-p/1111436"
          rel="noreferrer"
        >
          <small>How to get it</small>
        </a>
      </label>
      <label>
        Tempo API token
        <input
          name="jira.token"
          defaultValue={store.get('jira').token}
          type="password"
        />
        <a
          target="_blank"
          href="https://tempo-io.atlassian.net/wiki/spaces/THC/pages/840531971/Using+REST+API+Integrations+-+Tempo+Cloud#UsingRESTAPIIntegrations-TempoCloud-CreatingaNewToken"
          rel="noreferrer"
        >
          <small>How to get it</small>
        </a>
      </label>
      <button
        onClick={(e) => {
          e.preventDefault();
          close();
        }}
      >
        Close
      </button>
      <input type="submit" value="Save" />
    </form>
  );
};
