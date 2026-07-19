import { EditorView } from "@codemirror/view";
import { useLayoutEffect } from "react";
import type { FindTicketId } from "../core/billable";
import { cmdDownState } from "./cmdState";
import { useTicketPopupActions } from "./entryPane/ticketPopup";
import { notesConfigField, setNotesConfig, ticketRefAt } from "./notesEditor/config";
import { notesDecorationsPlugin } from "./notesEditor/decorations";
import { openLinkOnCmdClick } from "./notesEditor/linkInteraction";
import { ticketInteraction } from "./ticketInteraction";
import { useCodeMirror } from "./useCodeMirror";

interface Props {
  readonly text: string;
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
  readonly onChange: (text: string) => void;
  readonly onCaretChange: (caret: number) => void;
  readonly onBlur: () => void;
}

const editorTheme = EditorView.theme({
  ".cm-aptt-comment": { color: "var(--color-muted)" },
  "&.cm-aptt-cmd-down .cm-aptt-url:hover": {
    color: "var(--color-link)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  "&.cm-aptt-cmd-down .cm-aptt-ticket-link:hover": {
    color: "var(--color-link)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  "&.cm-aptt-cmd-down .cm-aptt-ticket:hover": { cursor: "help" },
});

export const NotesEditor = (props: Props) => {
  const actions = useTicketPopupActions();
  const { hostRef, viewRef } = useCodeMirror({
    text: props.text,
    extensions: [
      notesConfigField,
      notesDecorationsPlugin,
      cmdDownState,
      openLinkOnCmdClick,
      ticketInteraction({
        refAt: (view, pos) => ticketRefAt(view, pos),
        ticketUrl: (view, ticketId) => view.state.field(notesConfigField).ticketUrl(ticketId),
        onHover: (_view, ref, anchor) => actions.openTicket(ref.ticketId, anchor),
      }),
      editorTheme,
      EditorView.lineWrapping,
    ],
    onChange: props.onChange,
    onCaretChange: props.onCaretChange,
    onBlur: props.onBlur,
  });

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (view === null) return;
    view.dispatch({
      effects: setNotesConfig.of({
        findTicketId: props.findTicketId,
        ticketUrl: props.ticketUrl,
      }),
    });
  }, [props.findTicketId, props.ticketUrl, viewRef]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
};
