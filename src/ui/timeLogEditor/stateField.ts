import { StateEffect, StateField } from "@codemirror/state";
import type { FindTicketId } from "../../core/billable";
import type { TimeLog, TimeLogParseError } from "../../core/timeLog";

export interface TimeLogState {
  readonly log: TimeLog;
  readonly parseError: TimeLogParseError | null;
  readonly now: Date;
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
}

export const setTimeLogState = StateEffect.define<TimeLogState>();

const initial: TimeLogState = {
  log: { closed: [], active: null },
  parseError: null,
  now: new Date(0),
  findTicketId: () => null,
  ticketUrl: () => null,
};

export const timeLogStateField = StateField.define<TimeLogState>({
  create: () => initial,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setTimeLogState)) return effect.value;
    }
    return value;
  },
});
