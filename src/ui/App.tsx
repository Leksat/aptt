import { confirm } from "@tauri-apps/plugin-dialog";
import { Either } from "effect";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { closedBillableMinutes, formatDurationShort } from "../core/billable";
import { appendNewStart, formatTimeLog, parseTimeLog } from "../core/timeLog";
import { SettingsPane } from "./SettingsPane";
import { StatusLine } from "./StatusLine";
import { useCore } from "./useCore";
import { useTrayTitle } from "./useTrayTitle";

export default function App() {
  const core = useCore();
  useTrayTitle(core.entries.text);
  const submitter = core.config.snapshot.submitter;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsed = parseTimeLog(core.entries.text);
  const logIsValid = Either.isRight(parsed);
  const closedCount = Either.isRight(parsed) ? parsed.right.closed.length : 0;
  const closedBillable = Either.isRight(parsed)
    ? closedBillableMinutes(parsed.right, submitter.parseTargetId)
    : 0;
  const submitDisabled = !logIsValid || closedCount === 0 || core.submit.isInFlight;

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

  const handleSubmit = async () => {
    if (Either.isLeft(parsed)) return;
    const ok = await confirm("Are you sure?", { title: "aptt", kind: "warning" });
    if (!ok) return;
    const result = await core.submit.submit(parsed.right, submitter);
    core.entries.setText(formatTimeLog(result.log));
  };

  return (
    <main className="flex h-screen flex-col gap-3 p-4">
      <div className="flex min-h-0 flex-1 gap-3">
        <textarea
          ref={textareaRef}
          value={core.entries.text}
          onChange={core.entries.onChange}
          readOnly={core.submit.isInFlight}
          className="flex-1 resize-none border border-gray-300 p-2 font-mono read-only:bg-gray-100"
          spellCheck={false}
        />
        <SettingsPane />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNew}
          disabled={!logIsValid || core.submit.isInFlight}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          New
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          {submitDisabled ? "Submit" : `Submit ${formatDurationShort(closedBillable)}`}
        </button>
      </div>
      <StatusLine />
    </main>
  );
}
