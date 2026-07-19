import { StateEffect, StateField } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { FindTicketId } from "../../core/billable";
import { findLinks } from "../../core/notes";
import { findTicketRefs, type TicketRef } from "../../core/ticketRef";

export interface NotesConfig {
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
}

export const setNotesConfig = StateEffect.define<NotesConfig>();

const initial: NotesConfig = {
  findTicketId: () => null,
  ticketUrl: () => null,
};

export const notesConfigField = StateField.define<NotesConfig>({
  create: () => initial,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setNotesConfig)) return effect.value;
    }
    return value;
  },
});

export const ticketRefAt = (view: EditorView, pos: number): TicketRef | null => {
  const { findTicketId } = view.state.field(notesConfigField);
  const line = view.state.doc.lineAt(pos);
  for (const ref of findTicketRefs(line.text, findTicketId, findLinks(line.text))) {
    const from = line.from + ref.from;
    const to = line.from + ref.to;
    if (pos >= from && pos < to) return { from, to, ticketId: ref.ticketId };
  }
  return null;
};
