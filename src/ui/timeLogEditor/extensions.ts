import type { Extension } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { cmdDownState } from "../cmdState";
import { ticketInteraction } from "../ticketInteraction";
import { timeLogDecorationsPlugin } from "./decorations";
import { timeLogStateField } from "./stateField";
import { timeLogTicketRefAt } from "./tickets";

export const timeLogEditorTheme = EditorView.theme({
  ".cm-gutters": {
    background: "transparent",
    color: "var(--color-muted)",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-lineNumbers .cm-gutterElement": { textAlign: "right" },
  ".cm-activeLineGutter": { background: "transparent" },
  ".cm-aptt-duration": {
    color: "var(--color-muted)",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  ".cm-aptt-blocker": { color: "var(--color-attention)", fontWeight: "bold" },
  "&.cm-aptt-cmd-down .cm-aptt-ticket-link:hover": {
    color: "var(--color-link)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  "&.cm-aptt-cmd-down .cm-aptt-ticket:hover": { cursor: "help" },
  ".cm-aptt-error-line": {
    backgroundColor: "color-mix(in srgb, var(--color-attention) 18%, transparent)",
  },
});

interface Options {
  readonly showLineNumbers: boolean;
  readonly onOpenEntry: (startLine: number, anchor: DOMRect) => void;
}

export const timeLogEditorExtensions = ({ showLineNumbers, onOpenEntry }: Options): Extension[] => [
  ...(showLineNumbers ? [lineNumbers()] : []),
  timeLogStateField,
  timeLogDecorationsPlugin,
  cmdDownState,
  ticketInteraction({
    refAt: (view, pos) => timeLogTicketRefAt(view, pos),
    ticketUrl: (view, ticketId) => view.state.field(timeLogStateField).ticketUrl(ticketId),
    onHover: (view, ref, anchor) => {
      const startLine = view.state.doc.lineAt(ref.from).number - 1;
      onOpenEntry(startLine, anchor);
    },
  }),
  timeLogEditorTheme,
];
