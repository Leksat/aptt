export interface Entry {
  start: string;
  description: string;
}

export interface State {
  entries: Entry[];
  jira: {
    url: string;
    username: string;
    password: string;
  };
  window: {
    height: number;
    width: number;
  };
  shortcuts: {
    newEntry: string;
    displayWindow: string;
  };
}
