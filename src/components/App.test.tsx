import { describe, expect, test } from 'vitest';
import App from './App';
import { render, screen } from '@testing-library/react';
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

    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();

    expect(screen.getByTestId('textarea')).toBeVisible();

    expect(screen.getByRole('button', { name: 'New/Stop' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'New from selected' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible();

    expect(screen.getByTestId('summary')).toBeVisible();
  });
});
