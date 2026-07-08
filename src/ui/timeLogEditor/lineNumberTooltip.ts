import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateField,
} from "@codemirror/state";
import {
  type BlockInfo,
  type EditorView,
  GutterMarker,
  gutterLineClass,
  lineNumbers,
} from "@codemirror/view";
import { timeLogStateField } from "./stateField";

const openTooltip = (view: EditorView, block: BlockInfo, event: Event): boolean => {
  const handler = view.state.field(timeLogStateField).onLineNumberClick;
  if (handler === null) return false;
  const lineNumber = view.state.doc.lineAt(block.from).number;
  if (lineNumber % 2 !== 0) return false;
  const selection = window.getSelection();
  if (selection !== null && !selection.isCollapsed) return false;
  if (!(event.target instanceof Element)) return false;
  const element = event.target.closest(".cm-gutterElement");
  if (element === null) return false;
  handler(lineNumber - 1, element.getBoundingClientRect());
  return true;
};

const tooltipLineMarker = new (class extends GutterMarker {
  override elementClass = "cm-aptt-tooltip-line";
})();

const buildDescriptionLineMarkers = (state: EditorState): RangeSet<GutterMarker> => {
  const builder = new RangeSetBuilder<GutterMarker>();
  for (let lineNumber = 2; lineNumber <= state.doc.lines; lineNumber += 2) {
    const from = state.doc.line(lineNumber).from;
    builder.add(from, from, tooltipLineMarker);
  }
  return builder.finish();
};

const descriptionLineMarkers = StateField.define<RangeSet<GutterMarker>>({
  create: buildDescriptionLineMarkers,
  update: (value, tr) => (tr.docChanged ? buildDescriptionLineMarkers(tr.state) : value),
  provide: (field) => gutterLineClass.from(field),
});

export const lineNumberTooltip: Extension = [
  lineNumbers({ domEventHandlers: { click: openTooltip } }),
  descriptionLineMarkers,
];
