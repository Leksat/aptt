import { clipboard } from 'electron';

export const getTicketFromClipboard = (): string =>
  parseTicket(clipboard.readText('clipboard'));

export const parseTicket = (text: string): string =>
  text.match(/[A-Z]+-\d+/)?.[0] || '';
