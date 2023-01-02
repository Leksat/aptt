import '@testing-library/jest-dom';

import { mockIPC } from '@tauri-apps/api/mocks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { store } from '../lib/store';
import { Settings } from './Settings';

beforeEach(() => {
  store.clear();
});

describe('Settings', () => {
  test('Basics', async () => {
    mockIPC(() => null);
    render(<Settings close={() => {}} />);

    await userEvent.type(screen.getByLabelText(/Jira Account ID/), 'AccountId');
    await userEvent.type(screen.getByLabelText(/Tempo API token/), 'Token');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.get('jira').workerId).toBe('');
    expect(store.get('jira').token).toBe('');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(store.get('jira').workerId).toBe('AccountId');
    expect(store.get('jira').token).toBe('Token');
  });
});
