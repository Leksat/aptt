import type { Range } from "@codemirror/state";
import { Decoration, type DecorationSet, type EditorView, ViewPlugin } from "@codemirror/view";
import { lineDurations } from "../../core/billable";
import { findAllBlockers } from "../../core/blocker";
import { DurationWidget } from "./durationWidget";
import { timeLogStateField } from "./stateField";

export const timeLogDecorationsPlugin = ViewPlugin.define(
  (view) => ({
    decorations: buildDecorations(view),
    update(update) {
      const stateChanged =
        update.state.field(timeLogStateField) !== update.startState.field(timeLogStateField);
      if (update.docChanged || update.viewportChanged || stateChanged) {
        this.decorations = buildDecorations(update.view);
      }
    },
  }),
  { decorations: (v) => v.decorations },
);

const errorLineDecoration = Decoration.line({ class: "cm-aptt-error-line" });
const blockerMarkDecoration = Decoration.mark({ class: "cm-aptt-blocker" });

const buildDecorations = (view: EditorView): DecorationSet => {
  const state = view.state.field(timeLogStateField);
  const doc = view.state.doc;
  const text = doc.toString();
  const ranges: Range<Decoration>[] = [];

  if (
    state.parseError !== null &&
    state.parseError.line >= 1 &&
    state.parseError.line <= doc.lines
  ) {
    const line = doc.line(state.parseError.line);
    ranges.push(errorLineDecoration.range(line.from));
  }

  for (const blocker of findAllBlockers(state.log, text, state.findTargetId)) {
    if (blocker.to <= doc.length) {
      ranges.push(blockerMarkDecoration.range(blocker.from, blocker.to));
    }
  }

  for (const duration of lineDurations(state.log, state.now)) {
    if (duration.line < 1 || duration.line > doc.lines) continue;
    const line = doc.line(duration.line);
    ranges.push(
      Decoration.widget({
        widget: new DurationWidget(duration.minutes, duration.line),
        side: 1,
      }).range(line.to),
    );
  }

  return Decoration.set(ranges, true);
};
