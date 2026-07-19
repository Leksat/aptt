import { Compartment, EditorState } from "@codemirror/state";
import { Either } from "effect";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { FindTicketId } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { useTicketPopupActions } from "./entryPane/ticketPopup";
import { timeLogEditorExtensions } from "./timeLogEditor/extensions";
import { setTimeLogState } from "./timeLogEditor/stateField";
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

export const TimeLogEditor = forwardRef<TimeLogEditorRef, Props>(
  function TimeLogEditor(props, ref) {
    const actions = useTicketPopupActions();
    const readOnlyCompartment = useRef(new Compartment());
    const { hostRef, viewRef } = useCodeMirror({
      text: props.text,
      extensions: [
        ...timeLogEditorExtensions({ showLineNumbers: true, onOpenEntry: actions.openEntry }),
        readOnlyCompartment.current.of(EditorState.readOnly.of(props.readOnly)),
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
