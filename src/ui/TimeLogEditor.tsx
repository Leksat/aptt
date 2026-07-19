import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { Either } from "effect";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { FindTicketId } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { cmdDownState } from "./cmdState";
import { useTicketPopupActions } from "./entryPane/ticketPopup";
import { ticketInteraction } from "./ticketInteraction";
import { timeLogDecorationsPlugin } from "./timeLogEditor/decorations";
import { setTimeLogState, timeLogStateField } from "./timeLogEditor/stateField";
import { timeLogTicketRefAt } from "./timeLogEditor/tickets";
import { useCodeMirror } from "./useCodeMirror";

export interface TimeLogEditorRef {
  focus(): void;
  focusEnd(): void;
}

interface Props {
  readonly text: string;
  readonly now: Date;
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
  readonly readOnly: boolean;
  readonly onChange: (text: string) => void;
  readonly onCaretChange: (caret: number) => void;
  readonly onBlur: () => void;
}

const editorTheme = EditorView.theme({
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
  "&.cm-readonly .cm-content": { background: "var(--color-surface)" },
});

export const TimeLogEditor = forwardRef<TimeLogEditorRef, Props>(
  function TimeLogEditor(props, ref) {
    const actions = useTicketPopupActions();
    const readOnlyCompartment = useRef(new Compartment());
    const { hostRef, viewRef } = useCodeMirror({
      text: props.text,
      extensions: [
        lineNumbers(),
        timeLogStateField,
        timeLogDecorationsPlugin,
        cmdDownState,
        ticketInteraction({
          refAt: (view, pos) => timeLogTicketRefAt(view, pos),
          ticketUrl: (view, ticketId) => view.state.field(timeLogStateField).ticketUrl(ticketId),
          onHover: (view, ref, anchor) => {
            const startLine = view.state.doc.lineAt(ref.from).number - 1;
            actions.openEntry(startLine, anchor);
          },
        }),
        readOnlyCompartment.current.of(EditorState.readOnly.of(props.readOnly)),
        editorTheme,
      ],
      onChange: props.onChange,
      onCaretChange: props.onCaretChange,
      onBlur: props.onBlur,
    });

    useLayoutEffect(() => {
      const view = viewRef.current;
      if (view === null) return;
      const parsed = parseTimeLog(props.text);
      const log = Either.isRight(parsed) ? parsed.right : { closed: [], active: null };
      const parseError = Either.isLeft(parsed) ? parsed.left : null;
      view.dispatch({
        effects: setTimeLogState.of({
          log,
          parseError,
          now: props.now,
          findTicketId: props.findTicketId,
          ticketUrl: props.ticketUrl,
        }),
      });
    }, [props.text, props.now, props.findTicketId, props.ticketUrl, viewRef]);

    useLayoutEffect(() => {
      const view = viewRef.current;
      if (view === null) return;
      view.dispatch({
        effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(props.readOnly)),
      });
    }, [props.readOnly, viewRef]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => viewRef.current?.focus(),
        focusEnd: () => {
          const view = viewRef.current;
          if (view === null) return;
          view.focus();
          view.dispatch({
            selection: { anchor: view.state.doc.length },
            scrollIntoView: true,
          });
        },
      }),
      [viewRef],
    );

    return <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />;
  },
);
