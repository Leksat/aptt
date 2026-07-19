import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useLayoutEffect } from "react";
import type { FindTicketId } from "../core/billable";
import type { TimeLog } from "../core/timeLog";
import { timeLogEditorExtensions } from "./timeLogEditor/extensions";
import { setTimeLogState } from "./timeLogEditor/stateField";
import { useCodeMirror } from "./useCodeMirror";

interface Props {
  readonly text: string;
  readonly log: TimeLog;
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
  readonly onOpenEntry: (startLine: number, anchor: DOMRect) => void;
}

const autoHeightTheme = EditorView.theme({
  "&": { height: "auto !important" },
  ".cm-scroller": { overflow: "visible !important" },
  ".cm-content": { color: "color-mix(in srgb, var(--color-text) 80%, var(--color-bg))" },
});

const noop = () => {};

export const HistoryEntryEditor = ({ text, log, findTicketId, ticketUrl, onOpenEntry }: Props) => {
  const { hostRef, viewRef } = useCodeMirror({
    text,
    extensions: [
      ...timeLogEditorExtensions({ showLineNumbers: false, onOpenEntry }),
      EditorState.readOnly.of(true),
      autoHeightTheme,
    ],
    onChange: noop,
    onCaretChange: noop,
    onBlur: noop,
  });

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    view.dispatch({
      effects: setTimeLogState.of({
        log,
        parseError: null,
        now: new Date(0),
        findTicketId,
        ticketUrl,
      }),
    });
  }, [log, findTicketId, ticketUrl, viewRef]);

  return <div ref={hostRef} />;
};
