import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useLayoutEffect, useRef } from "react";
import { notesDecorationsPlugin } from "./notesEditor/decorations";

interface Props {
  readonly text: string;
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
  ".cm-activeLine": { background: "transparent" },
  ".cm-aptt-comment": { color: "var(--color-muted)" },
  ".cm-selectionBackground": {
    background: "color-mix(in srgb, var(--color-text) 22%, transparent) !important",
  },
});

export const NotesEditor = (props: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
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
        EditorView.contentAttributes.of({ spellcheck: "false" }),
        notesDecorationsPlugin,
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

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
};
