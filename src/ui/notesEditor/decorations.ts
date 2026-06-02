import type { Range } from "@codemirror/state";
import { Decoration, type DecorationSet, type EditorView, ViewPlugin } from "@codemirror/view";
import { commentStart } from "../../core/notes";

export const notesDecorationsPlugin = ViewPlugin.define(
  (view) => ({
    decorations: buildDecorations(view),
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    },
  }),
  { decorations: (v) => v.decorations },
);

const commentMarkDecoration = Decoration.mark({ class: "cm-aptt-comment" });

const buildDecorations = (view: EditorView): DecorationSet => {
  const doc = view.state.doc;
  const ranges: Range<Decoration>[] = [];
  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const at = commentStart(line.text);
    if (at === null) continue;
    ranges.push(commentMarkDecoration.range(line.from + at, line.to));
  }
  return Decoration.set(ranges, true);
};
