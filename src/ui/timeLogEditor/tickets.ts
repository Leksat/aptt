import type { EditorView } from "@codemirror/view";
import { firstTicketRef, type TicketRef } from "../../core/ticketRef";
import { timeLogStateField } from "./stateField";

export const timeLogTicketRefAt = (view: EditorView, pos: number): TicketRef | null => {
  const line = view.state.doc.lineAt(pos);
  if (line.number % 2 !== 0) return null;
  const ref = firstTicketRef(line.text, view.state.field(timeLogStateField).findTicketId);
  if (ref === null) return null;
  const from = line.from + ref.from;
  const to = line.from + ref.to;
  if (pos < from || pos >= to) return null;
  return { from, to, ticketId: ref.ticketId };
};
