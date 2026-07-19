import type { Range } from "@codemirror/state";
import { Decoration, type DecorationSet, type EditorView, ViewPlugin } from "@codemirror/view";
import { commentStart, findLinks } from "../../core/notes";
import { findTicketRefs } from "../../core/ticketRef";
import { notesConfigField } from "./config";

export const notesDecorationsPlugin = ViewPlugin.define(
  (view) => ({
    decorations: buildDecorations(view),
    update(update) {
      const configChanged =
        update.state.field(notesConfigField) !== update.startState.field(notesConfigField);
      if (update.docChanged || update.viewportChanged || configChanged) {
        this.decorations = buildDecorations(update.view);
      }
    },
  }),
  { decorations: (v) => v.decorations },
);

const commentMarkDecoration = Decoration.mark({ class: "cm-aptt-comment" });
const linkMarkDecoration = Decoration.mark({ class: "cm-aptt-url" });
const ticketMarkDecoration = Decoration.mark({ class: "cm-aptt-ticket" });
const ticketLinkMarkDecoration = Decoration.mark({ class: "cm-aptt-ticket-link" });

const buildDecorations = (view: EditorView): DecorationSet => {
  const doc = view.state.doc;
  const { findTicketId, ticketUrl } = view.state.field(notesConfigField);
  const text = doc.toString();
  const ranges: Range<Decoration>[] = [];
  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const at = commentStart(line.text);
    if (at === null) continue;
    ranges.push(commentMarkDecoration.range(line.from + at, line.to));
  }
  const links = findLinks(text);
  for (const link of links) {
    ranges.push(linkMarkDecoration.range(link.from, link.to));
  }
  for (const ref of findTicketRefs(text, findTicketId, links)) {
    const decoration =
      ticketUrl(ref.ticketId) === null ? ticketMarkDecoration : ticketLinkMarkDecoration;
    ranges.push(decoration.range(ref.from, ref.to));
  }
  return Decoration.set(ranges, true);
};
