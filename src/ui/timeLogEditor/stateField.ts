import { StateEffect, StateField } from "@codemirror/state";
import type { FindTargetId } from "../../core/billable";
import type { TimeLog, TimeLogParseError } from "../../core/timeLog";

export type LineNumberClickHandler = (startLine: number, anchor: DOMRect) => void;

export interface TimeLogState {
  readonly log: TimeLog;
  readonly parseError: TimeLogParseError | null;
  readonly now: Date;
  readonly findTargetId: FindTargetId;
  readonly onLineNumberClick: LineNumberClickHandler | null;
}

export const setTimeLogState = StateEffect.define<TimeLogState>();

const initial: TimeLogState = {
  log: { closed: [], active: null },
  parseError: null,
  now: new Date(0),
  findTargetId: () => null,
  onLineNumberClick: null,
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
