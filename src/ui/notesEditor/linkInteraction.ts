import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { findLinks } from "../../core/notes";
import { openExternal } from "../openExternal";

const cmdDownClass = "cm-aptt-cmd-down";

const cmdStatePlugin = ViewPlugin.define((view) => {
  const setArmed = (armed: boolean): void => {
    view.dom.classList.toggle(cmdDownClass, armed);
  };
  const onKey = (event: KeyboardEvent): void => setArmed(event.metaKey);
  const disarm = (): void => setArmed(false);

  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("blur", disarm);
  view.contentDOM.addEventListener("blur", disarm);

  return {
    destroy() {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", disarm);
      view.contentDOM.removeEventListener("blur", disarm);
    },
  };
});

const openLinkOnCmdClick = EditorView.domEventHandlers({
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

export const linkInteraction: readonly Extension[] = [cmdStatePlugin, openLinkOnCmdClick];
