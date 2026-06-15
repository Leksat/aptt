import { confirm, message } from "@tauri-apps/plugin-dialog";
import { Either } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  activeBillableTargetId,
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
  withActiveDescription,
} from "../core/timeLog";
import { EntryDetails } from "./entryPane/EntryDetails";
import { EntryTooltip } from "./entryPane/EntryTooltip";
import { entryAtStartLine } from "./entryPane/focusedEntry";
import { useExtendedInfo } from "./entryPane/useExtendedInfo";
import { FocusedSourceProvider, useFocusedSource } from "./FocusedSourceContext";
import { RightPane } from "./RightPane";
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
  const submitter = core.config.snapshot.submitter;
  const includeLocalInLogged = core.config.snapshot.config.includeLocalInLogged;
  useThemeApplication(core.config.snapshot.config.themeMode);
  const editorRef = useRef<TimeLogEditorRef>(null);
  const focused = useFocusedSource();
  const now = useMinuteTick();
  const [tooltip, setTooltip] = useState<{ line: number; anchor: DOMRect } | null>(null);

  useEffect(() => {
    const onFocus = () => editorRef.current?.focusEnd();
    window.addEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
  }, []);

  const parsed = parseTimeLog(core.entries.text);
  const parsedLog = Either.isRight(parsed) ? parsed.right : null;
  const focusedEntry =
    tooltip !== null && parsedLog !== null ? entryAtStartLine(parsedLog, tooltip.line) : null;
  const extendedInfo = useExtendedInfo({
    log: parsedLog ?? { closed: [], active: null },
    focused: focusedEntry,
    now,
    submitter,
  });

  const handleDurationClick = useCallback((line: number, anchor: DOMRect) => {
    setTooltip((prev) => (prev !== null && prev.line === line ? null : { line, anchor }));
  }, []);
  const dismissTooltip = useCallback(() => setTooltip(null), []);

  const logIsValid = Either.isRight(parsed);
  const closedCount = Either.isRight(parsed) ? parsed.right.closed.length : 0;
  const closedBillable = Either.isRight(parsed)
    ? closedBillableMinutes(parsed.right, submitter.findTargetId)
    : 0;
  const trayTitle = Either.isRight(parsed)
    ? activeBillableTargetId(parsed.right, submitter.findTargetId)
    : null;
  useTrayTitle(trayTitle);
  const submitDisabled = !logIsValid || closedCount === 0 || core.submit.isInFlight;

  const derivedDescription = deriveDescription(
    focused.state,
    core.entries.text,
    core.notes.text,
    submitter.findTargetId,
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
    const blocker = findBlocker(parsed.right, core.entries.text, submitter.findTargetId);
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
    const result = await core.submit.submit(parsed.right, submitter);
    core.entries.setText(formatTimeLog(result.log));
  };

  return (
    <main className="flex h-screen flex-col gap-3 p-3">
      <div className="flex min-h-0 flex-1 gap-3">
        <TimeLogEditor
          ref={editorRef}
          text={core.entries.text}
          now={now}
          findTargetId={submitter.findTargetId}
          readOnly={core.submit.isInFlight}
          onChange={core.entries.setText}
          onCaretChange={(caret) => focused.set({ source: "timeLog", caret })}
          onBlur={() => focused.set((s) => (s?.source === "timeLog" ? null : s))}
          onDurationClick={handleDurationClick}
        />
        <RightPane />
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
        <button
          type="button"
          onClick={core.history.open}
          className="rounded border border-[var(--color-border)] px-3 py-1"
        >
          History
        </button>
      </div>
      <StatusLine />
      {tooltip !== null && extendedInfo !== null && (
        <EntryTooltip anchor={tooltip.anchor} onDismiss={dismissTooltip}>
          <EntryDetails
            info={extendedInfo}
            includeLocalInLogged={includeLocalInLogged}
            onToggleIncludeLocalInLogged={core.config.setIncludeLocalInLogged}
          />
        </EntryTooltip>
      )}
    </main>
  );
};

const deriveDescription = (
  state: ReturnType<typeof useFocusedSource>["state"],
  timeLogText: string,
  notesText: string,
  findTargetId: (text: string) => string | null,
): string | null => {
  if (state === null) return null;
  if (state.source === "timeLog") return selectedDescriptionFromTimeLog(timeLogText, state.caret);
  return selectedDescriptionFromNotes(notesText, state.caret, findTargetId);
};
