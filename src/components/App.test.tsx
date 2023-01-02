import { describe, expect, test } from 'vitest';
import App from './App';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockIPC } from '@tauri-apps/api/mocks';
import '@testing-library/jest-dom';
import { store } from '../lib/store';

beforeEach(() => {
  store.clear();
});

describe('App tests', () => {
  test('Basic elements', async () => {
    mockIPC(() => null);
    render(<App />);

    expect(screen.getByTestId('textarea')).toBeVisible();

    expect(screen.getByRole('button', { name: 'New/Stop' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'New from selected' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeVisible();

    expect(screen.getByTestId('summary')).toBeVisible();
  });

  test('Settings', async () => {
    mockIPC(() => null);
    render(<App />);

    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('settings')).toBeVisible();
    await userEvent.type(screen.getByLabelText(/Jira Account ID/), 'AccountId');
    await userEvent.type(screen.getByLabelText(/Tempo API token/), 'Token');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
    expect(store.get('jira').workerId).toBe('');
    expect(store.get('jira').token).toBe('');

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('settings')).toBeVisible();
    expect(screen.getByLabelText(/Jira Account ID/)).toHaveValue('');
    expect(screen.getByLabelText(/Tempo API token/)).toHaveValue('');
    await userEvent.type(screen.getByLabelText(/Jira Account ID/), 'AccountId');
    await userEvent.type(screen.getByLabelText(/Tempo API token/), 'Token');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
    expect(store.get('jira').workerId).toBe('AccountId');
    expect(store.get('jira').token).toBe('Token');
  });
});
