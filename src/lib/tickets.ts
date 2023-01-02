import { clipboard } from '@tauri-apps/api';

export const getTicketFromClipboard = async (): Promise<string> =>
  parseTicket((await clipboard.readText()) || '');

export const parseTicket = (text: string): string =>
  text.match(/[A-Z][A-Z0-9]*-\d+/)?.[0] || '';
