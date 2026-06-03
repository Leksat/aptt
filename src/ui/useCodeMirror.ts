import {
  defaultKeymap,
  deleteCharBackwardStrict,
  history,
  historyKeymap,
} from "@codemirror/commands";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useLayoutEffect, useRef } from "react";

interface Args {
  readonly text: string;
  readonly extensions: readonly Extension[];
  readonly onChange: (text: string) => void;
  readonly onCaretChange: (caret: number) => void;
  readonly onBlur: () => void;
}

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    background: "transparent",
    color: "var(--color-text)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "inherit", overflow: "auto" },
  ".cm-content": { caretColor: "var(--color-text)", padding: "0" },
  ".cm-line": { lineHeight: "inherit" },
  ".cm-activeLine": { background: "transparent" },
  ".cm-selectionBackground": {
    background: "color-mix(in srgb, var(--color-text) 22%, transparent) !important",
  },
});

const baseExtensions: readonly Extension[] = [
  history(),
  keymap.of([{ key: "Backspace", run: deleteCharBackwardStrict, shift: deleteCharBackwardStrict }]),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.contentAttributes.of({ spellcheck: "false" }),
  baseTheme,
];

export const useCodeMirror = (args: Args) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacksRef = useRef(args);
  callbacksRef.current = args;

  useLayoutEffect(() => {
    if (hostRef.current === null) return;
    const init = callbacksRef.current;
    const state = EditorState.create({
      doc: init.text,
      extensions: [
        ...init.extensions,
        ...baseExtensions,
        EditorView.updateListener.of((update) => {
          const cb = callbacksRef.current;
          if (update.docChanged) {
            cb.onChange(update.state.doc.toString());
          }
          if (update.focusChanged) {
            if (update.view.hasFocus) {
              cb.onCaretChange(update.state.selection.main.head);
            } else {
              cb.onBlur();
            }
            return;
          }
          if (update.docChanged || update.selectionSet) {
            cb.onCaretChange(update.state.selection.main.head);
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
    if (view.state.doc.toString() === args.text) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: args.text },
    });
  }, [args.text]);

  return { hostRef, viewRef };
};
