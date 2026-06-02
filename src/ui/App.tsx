import { confirm } from "@tauri-apps/plugin-dialog";
import { Either } from "effect";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  activeBillableTargetId,
  closedBillableMinutes,
  formatDurationShort,
} from "../core/billable";
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
import { caretOf, FocusedSourceProvider, useFocusedSource } from "./FocusedSourceContext";
import { RightPane } from "./RightPane";
import { StatusLine } from "./StatusLine";
import { useCore } from "./useCore";
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
  useThemeApplication(core.config.snapshot.config.themeMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focused = useFocusedSource();

  useEffect(() => {
    const onFocus = () => {
      const el = textareaRef.current;
      if (el === null) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    };
    window.addEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_TEXTAREA_EVENT, onFocus);
  }, []);

  const parsed = parseTimeLog(core.entries.text);
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

  const trackCaret = (el: HTMLTextAreaElement) =>
    focused.set({ source: "timeLog", caret: caretOf(el) });

  const handleNew = () => {
    if (Either.isLeft(parsed)) return;
    const next = formatTimeLog(appendNewStart(parsed.right, new Date()));
    if (next === core.entries.text) return;
    flushSync(() => core.entries.setText(next));
    const el = textareaRef.current;
    if (el === null) return;
    el.focus();
    el.setSelectionRange(next.length, next.length);
  };

  const handleNewFromSelected = () => {
    if (Either.isLeft(parsed) || derivedDescription === null) return;
    const next = formatTimeLog(
      withActiveDescription(appendNewStart(parsed.right, new Date()), `${derivedDescription} `),
    );
    flushSync(() => core.entries.setText(next));
    const el = textareaRef.current;
    if (el === null) return;
    el.focus();
    el.setSelectionRange(next.length, next.length);
  };

  const handleSubmit = async () => {
    if (Either.isLeft(parsed)) return;
    const ok = await confirm("Are you sure?", { title: "aptt", kind: "warning" });
    if (!ok) return;
    const result = await core.submit.submit(parsed.right, submitter);
    core.entries.setText(formatTimeLog(result.log));
  };

  return (
    <main className="flex h-screen flex-col gap-3 p-3">
      <div className="flex min-h-0 flex-1 gap-3">
        <textarea
          ref={textareaRef}
          value={core.entries.text}
          onChange={core.entries.onChange}
          onFocus={(e) => trackCaret(e.currentTarget)}
          onSelect={(e) => trackCaret(e.currentTarget)}
          onBlur={() => focused.set(null)}
          readOnly={core.submit.isInFlight}
          className="flex-1 resize-none read-only:bg-[var(--color-surface)]"
          spellCheck={false}
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
