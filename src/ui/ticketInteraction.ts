import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { TicketRef } from "../core/ticketRef";
import { openExternal } from "./openExternal";

export interface TicketInteractionAccess {
  readonly refAt: (view: EditorView, pos: number) => TicketRef | null;
  readonly ticketUrl: (view: EditorView, ticketId: string) => string | null;
  readonly onHover: (view: EditorView, ref: TicketRef, anchor: DOMRect) => void;
}

const refRect = (view: EditorView, ref: TicketRef): DOMRect | null => {
  const start = view.coordsAtPos(ref.from);
  const end = view.coordsAtPos(ref.to);
  if (start === null || end === null) return null;
  return new DOMRect(start.left, start.top, end.right - start.left, end.bottom - start.top);
};

export const ticketInteraction = (access: TicketInteractionAccess): Extension =>
  EditorView.domEventHandlers({
    mousemove(event, view) {
      if (!event.metaKey) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;
      const ref = access.refAt(view, pos);
      if (ref === null) return false;
      const anchor = refRect(view, ref);
      if (anchor === null) return false;
      access.onHover(view, ref, anchor);
      return false;
    },
    mousedown(event, view) {
      if (!event.metaKey) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;
      const ref = access.refAt(view, pos);
      if (ref === null) return false;
      const url = access.ticketUrl(view, ref.ticketId);
      if (url === null) return false;
      event.preventDefault();
      openExternal(url);
      return true;
    },
  });
