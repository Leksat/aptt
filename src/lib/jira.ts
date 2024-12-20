import { AppError } from './errors';
import { store, StoreChangedEvent } from './store';

// JIRA REST API
// https://support.atlassian.com/jira-software-cloud/docs/jira-rest-api-examples/
export const getJiraTicketId = async (ticket: string): Promise<string> => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${store.get('jira').jiraToken}`
    },
  };

  // Parse https://amazeelabs.atlassian.net/rest/api/3/issue/AL-1 --> returns JSON with issue key
  const response = await fetch(`https://amazeelabs.atlassian.net/rest/api/3/issue/${ticket}`, options);
  const data = await response.json();

  if (response.status !== 200 || !data.key) {
    throw new AppError('Failed to fetch JIRA ticket');
  }

  return data.key;
};
