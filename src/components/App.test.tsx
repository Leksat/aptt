import '@testing-library/jest-dom';

import { mockIPC } from '@tauri-apps/api/mocks';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { store } from '../lib/store';
import App from './App';

beforeEach(() => {
  store.clear();
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
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
