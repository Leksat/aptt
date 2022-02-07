export interface State {
  entries: string;
  jira: {
    workerId: string;
    token: string;
  };
  window: {
    height: number;
    width: number;
  };
  shortcuts: {
    newEntry: string;
    toggleWindow: string;
  };
}

export const defaults: State = {
  entries: '',
  jira: {
    workerId: '',
    token: '',
  },
  window: {
    height: 600,
    width: 800,
  },
  shortcuts: {
    newEntry: 'CommandOrControl+Alt+V',
    toggleWindow: 'CommandOrControl+Alt+X',
  },
};
