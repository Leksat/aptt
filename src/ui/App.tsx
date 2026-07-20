import { confirm, message } from "@tauri-apps/plugin-dialog";
import { Either } from "effect";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  activeBillableTicketId,
  closedBillableMinutes,
  formatDurationShort,
} from "../core/billable";
import { findBlocker } from "../core/blocker";
import {
  selectedDescriptionFromNotes,
  selectedDescriptionFromTimeLog,
} from "../core/selectedDescription";
import { FOCUS_TEXTAREA_EVENT } from "../core/services/ClipboardCaptureService";
import {
  appendNewStart,
  formatTimeLog,
  parseTimeLog,
  type TimeLog,
  withActiveDescription,
} from "../core/timeLog";
import { EntryDetails } from "./entryPane/EntryDetails";
import { EntryTooltip } from "./entryPane/EntryTooltip";
import { entryAtStartLine } from "./entryPane/focusedEntry";
import { TicketPopupProvider, useTicketPopup } from "./entryPane/ticketPopup";
import { type ExtendedInfoTarget, useExtendedInfo } from "./entryPane/useExtendedInfo";
import { FocusedSourceProvider, useFocusedSource } from "./FocusedSourceContext";
import { RightPane, type RightTab } from "./RightPane";
import { StatusLine } from "./StatusLine";
import { TimeLogEditor, type TimeLogEditorRef } from "./TimeLogEditor";
import { useCore } from "./useCore";
import { useMinuteTick } from "./useMinuteTick";
import { useThemeApplication } from "./useThemeApplication";
import { useTrayTitle } from "./useTrayTitle";

export default function App() {
  return (
    <FocusedSourceProvider>
      <AppInner />
    </FocusedSourceProvider>
  );
}

const AppInner = () => {
  const core = useCore();
  const backend = core.config.snapshot.backend;
  useThemeApplication(core.config.snapshot.config.themeMode);
  const editorRef = useRef<TimeLogEditorRef>(null);
  const focused = useFocusedSource();
  const now = useMinuteTick();
  const popup = useTicketPopup();
  const [rightTab, setRightTab] = useState<RightTab>("Notes");

  useEffect(() => {
    const onFocus = () => editorRef.current?.focusEnd();
    window.addEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
  }, []);

  const parsed = parseTimeLog(core.entries.text);
  const parsedLog = Either.isRight(parsed) ? parsed.right : null;
  const extendedTarget = resolveTarget(popup.target, parsedLog);
  const extendedInfo = useExtendedInfo({
    log: parsedLog ?? { closed: [], active: null },
    target: extendedTarget,
    now,
    backend,
  });

  const logIsValid = Either.isRight(parsed);
  const closedCount = Either.isRight(parsed) ? parsed.right.closed.length : 0;
  const closedBillable = Either.isRight(parsed)
    ? closedBillableMinutes(parsed.right, backend.findTicketId)
    : 0;
  const trayTitle = Either.isRight(parsed)
    ? activeBillableTicketId(parsed.right, backend.findTicketId)
    : null;
  useTrayTitle(trayTitle);
  const submitDisabled = !logIsValid || closedCount === 0 || core.submit.isInFlight;

  const derivedDescription = deriveDescription(
    focused.state,
    core.entries.text,
    core.notes.text,
    backend.findTicketId,
  );
  const newFromSelectedDisabled =
    !logIsValid || core.submit.isInFlight || derivedDescription === null;

  const handleNew = () => {
    if (Either.isLeft(parsed)) return;
    const next = formatTimeLog(appendNewStart(parsed.right, new Date()));
    if (next === core.entries.text) return;
    flushSync(() => core.entries.setText(next));
    editorRef.current?.focusEnd();
  };

  const handleNewFromSelected = () => {
    if (Either.isLeft(parsed) || derivedDescription === null) return;
    const next = formatTimeLog(
      withActiveDescription(appendNewStart(parsed.right, new Date()), `${derivedDescription} `),
    );
    flushSync(() => core.entries.setText(next));
    editorRef.current?.focusEnd();
  };

  const handleSubmit = async () => {
    if (Either.isLeft(parsed)) return;
    const blocker = findBlocker(parsed.right, core.entries.text, backend.findTicketId);
    if (blocker !== null) {
      await message(
        `Submission is blocked because line ${blocker.line} contains the exclamation mark.`,
        {
          title: "aptt",
          kind: "error",
        },
      );
      return;
    }
    const ok = await confirm("Are you sure?", { title: "aptt", kind: "warning" });
    if (!ok) return;
    const result = await core.submit.submit(parsed.right, backend);
    core.entries.setText(formatTimeLog(result.log));
  };

  return (
    <TicketPopupProvider value={popup.actions}>
      <main className="flex h-screen flex-col gap-3 p-3">
        <div className="flex min-h-0 flex-1 gap-3">
          <TimeLogEditor
            ref={editorRef}
            text={core.entries.text}
            now={now}
            findTicketId={backend.findTicketId}
            ticketUrl={backend.ticketUrl}
            readOnly={core.submit.isInFlight}
            onChange={core.entries.setText}
            onCaretChange={(caret) => focused.set({ source: "timeLog", caret })}
            onBlur={() => focused.set((s) => (s?.source === "timeLog" ? null : s))}
          />
          <RightPane active={rightTab} onSelect={setRightTab} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNew}
            disabled={!logIsValid || core.submit.isInFlight}
            className="rounded border border-[var(--color-border)] px-3 py-1 disabled:opacity-50"
          >
            New
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleNewFromSelected}
            disabled={newFromSelectedDisabled}
            className="rounded border border-[var(--color-border)] px-3 py-1 disabled:opacity-50"
          >
            New from cursor
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="rounded border border-[var(--color-border)] px-3 py-1 disabled:opacity-50"
          >
            {submitDisabled ? "Submit" : `Submit ${formatDurationShort(closedBillable)}`}
          </button>
          {rightTab === "History" && (
            <button
              type="button"
              onClick={core.history.open}
              className="ml-auto rounded border border-[var(--color-border)] px-3 py-1"
            >
              Open history folder
            </button>
          )}
        </div>
        <StatusLine />
        {popup.anchor !== null && extendedInfo !== null && (
          <EntryTooltip
            anchor={popup.anchor}
            onDismiss={popup.dismiss}
            onMouseEnter={popup.onPopupMouseEnter}
            onMouseLeave={popup.onPopupMouseLeave}
          >
            <EntryDetails info={extendedInfo} mode="live" />
          </EntryTooltip>
        )}
      </main>
    </TicketPopupProvider>
  );
};

const resolveTarget = (
  target: ReturnType<typeof useTicketPopup>["target"],
  log: TimeLog | null,
): ExtendedInfoTarget | null => {
  if (target === null) return null;
  if (target.kind === "ticket") return { kind: "ticket", ticketId: target.ticketId };
  if (log === null) return null;
  const focused = entryAtStartLine(log, target.startLine);
  return focused === null ? null : { kind: "entry", focused };
};

const deriveDescription = (
  state: ReturnType<typeof useFocusedSource>["state"],
  timeLogText: string,
  notesText: string,
  findTicketId: (text: string) => string | null,
): string | null => {
  if (state === null) return null;
  if (state.source === "timeLog") return selectedDescriptionFromTimeLog(timeLogText, state.caret);
  if (state.source === "history") return selectedDescriptionFromTimeLog(state.text, state.caret);
  return selectedDescriptionFromNotes(notesText, state.caret, findTicketId);
};
