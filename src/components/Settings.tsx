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
          siteName: data.get('jira.siteName') as string,
          email: data.get('jira.email') as string,
          workerId: data.get('jira.workerId') as string,
          jiraToken: data.get('jira.jiraToken') as string,
          tempoToken: data.get('jira.tempoToken') as string,
        });
        close();
      }}
    >
      <label>
        Jira site name
        <input name="jira.siteName" defaultValue={store.get('jira').siteName} />
        <small>
          E.g. `ivanproduction` (if the Jira URL is
          `https://ivanproduction.atlassian.net`)
        </small>
      </label>
      <label>
        Jira email
        <input name="jira.email" defaultValue={store.get('jira').email} />
        <small>E.g. `vasya@ivanproduction.com`</small>
      </label>
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
        Jira API token
        <input
          name="jira.jiraToken"
          defaultValue={store.get('jira').jiraToken}
          type="password"
        />
        <a
          target="_blank"
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          rel="noreferrer"
        >
          <small>Create it here</small>
        </a>
      </label>
      <label>
        Tempo API token
        <input
          name="jira.tempoToken"
          defaultValue={store.get('jira').tempoToken}
          type="password"
        />
        <a
          target="_blank"
          href="https://apidocs.tempo.io/#section/Authentication"
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
