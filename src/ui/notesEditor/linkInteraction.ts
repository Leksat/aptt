import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { findLinks } from "../../core/notes";
import { openExternal } from "../openExternal";

export const openLinkOnCmdClick: Extension = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (!event.metaKey) return false;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;
    const link = findLinks(view.state.doc.toString()).find((l) => pos >= l.from && pos < l.to);
    if (link === undefined) return false;
    event.preventDefault();
    openExternal(link.url);
    return true;
  },
});
