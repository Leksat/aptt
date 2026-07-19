import type { FindTicketId } from "./billable";

export interface TicketRef {
  readonly from: number;
  readonly to: number;
  readonly ticketId: string;
}

interface Range {
  readonly from: number;
  readonly to: number;
}

const refInToken = (
  token: string,
  tokenStart: number,
  findTicketId: FindTicketId,
): TicketRef | null => {
  const ticketId = findTicketId(token);
  if (ticketId === null) return null;
  const offset = token.indexOf(ticketId);
  if (offset === -1) return null;
  const from = tokenStart + offset;
  return { from, to: from + ticketId.length, ticketId };
};

export const firstTicketRef = (lineText: string, findTicketId: FindTicketId): TicketRef | null => {
  const match = /\S+/.exec(lineText);
  if (match === null) return null;
  return refInToken(match[0], match.index, findTicketId);
};

const overlapsAny = (from: number, to: number, ranges: ReadonlyArray<Range>): boolean =>
  ranges.some((range) => from < range.to && range.from < to);

export const findTicketRefs = (
  text: string,
  findTicketId: FindTicketId,
  excluded: ReadonlyArray<Range>,
): ReadonlyArray<TicketRef> => {
  const refs: TicketRef[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    if (match.index === undefined) continue;
    const token = match[0];
    if (overlapsAny(match.index, match.index + token.length, excluded)) continue;
    const ref = refInToken(token, match.index, findTicketId);
    if (ref !== null) refs.push(ref);
  }
  return refs;
};
