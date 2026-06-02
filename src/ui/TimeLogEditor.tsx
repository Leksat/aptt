import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { Either } from "effect";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { FindTargetId } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { timeLogDecorationsPlugin } from "./timeLogEditor/decorations";
import { setTimeLogState, timeLogStateField } from "./timeLogEditor/stateField";

export interface TimeLogEditorRef {
  focus(): void;
  focusEnd(): void;
}

interface Props {
  readonly text: string;
  readonly now: Date;
  readonly findTargetId: FindTargetId;
  readonly readOnly: boolean;
  readonly onChange: (text: string) => void;
  readonly onCaretChange: (caret: number) => void;
  readonly onBlur: () => void;
}

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontFamily: "inherit",
    fontSize: "inherit",
    background: "transparent",
    color: "var(--color-text)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", overflow: "auto" },
  ".cm-content": { caretColor: "var(--color-text)", padding: "0" },
  ".cm-gutters": {
    background: "transparent",
    color: "var(--color-muted)",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-lineNumbers .cm-gutterElement": { textAlign: "right" },
  ".cm-activeLine": { background: "transparent" },
  ".cm-activeLineGutter": { background: "transparent" },
  ".cm-aptt-duration": { color: "var(--color-muted)" },
  ".cm-aptt-blocker": { color: "var(--color-attention)", fontWeight: "bold" },
  ".cm-aptt-error-line": {
    backgroundColor: "color-mix(in srgb, var(--color-attention) 18%, transparent)",
  },
  "&.cm-readonly .cm-content": { background: "var(--color-surface)" },
  ".cm-selectionBackground": {
    background: "color-mix(in srgb, var(--color-text) 22%, transparent) !important",
  },
});

export const TimeLogEditor = forwardRef<TimeLogEditorRef, Props>(
  function TimeLogEditor(props, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const readOnlyCompartment = useRef(new Compartment());
    const callbacksRef = useRef(props);
    callbacksRef.current = props;

    useLayoutEffect(() => {
      if (hostRef.current === null) return;
      const initialProps = callbacksRef.current;
      const state = EditorState.create({
        doc: initialProps.text,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          lineNumbers(),
          EditorView.contentAttributes.of({ spellcheck: "false" }),
          timeLogStateField,
          timeLogDecorationsPlugin,
          readOnlyCompartment.current.of(EditorState.readOnly.of(initialProps.readOnly)),
          editorTheme,
          EditorView.updateListener.of((update) => {
            const callbacks = callbacksRef.current;
            if (update.docChanged) {
              callbacks.onChange(update.state.doc.toString());
            }
            if (update.focusChanged) {
              if (update.view.hasFocus) {
                callbacks.onCaretChange(update.state.selection.main.head);
              } else {
                callbacks.onBlur();
              }
              return;
            }
            if (update.docChanged || update.selectionSet) {
              callbacks.onCaretChange(update.state.selection.main.head);
            }
          }),
        ],
      });
      const view = new EditorView({ state, parent: hostRef.current });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []);

    useLayoutEffect(() => {
      const view = viewRef.current;
      if (view === null) return;
      if (view.state.doc.toString() === props.text) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: props.text },
      });
    }, [props.text]);

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
          findTargetId: props.findTargetId,
        }),
      });
    }, [props.text, props.now, props.findTargetId]);

    useLayoutEffect(() => {
      const view = viewRef.current;
      if (view === null) return;
      view.dispatch({
        effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(props.readOnly)),
      });
    }, [props.readOnly]);

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
      [],
    );

    return <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden" />;
  },
);
