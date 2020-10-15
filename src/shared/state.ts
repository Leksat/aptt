export interface State {
  entries: string;
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

export const defaults: State = {
  entries: '',
  jira: {
    url: '',
    username: '',
    password: '',
  },
  window: {
    height: 600,
    width: 800,
  },
  shortcuts: {
    newEntry: 'CommandOrControl+Alt+V',
    displayWindow: 'CommandOrControl+Alt+X',
  },
};
