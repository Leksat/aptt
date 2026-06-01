import { Either } from "effect";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { appendNewStart, formatTimeLog, parseTimeLog } from "../core/timeLog";
import { useEntries } from "./useEntries";
import { useTrayTitle } from "./useTrayTitle";

export default function App() {
  const { text, setText, onChange } = useEntries();
  useTrayTitle(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (text === null) {
    return <main className="p-4">Loading…</main>;
  }

  const parsed = parseTimeLog(text);
  const logIsValid = Either.isRight(parsed);

  const handleNew = () => {
    if (Either.isLeft(parsed)) return;
    const next = formatTimeLog(appendNewStart(parsed.right, new Date()));
    if (next === text) return;
    flushSync(() => setText(next));
    const el = textareaRef.current;
    if (el === null) return;
    el.focus();
    el.setSelectionRange(next.length, next.length);
  };

  return (
    <main className="flex h-screen flex-col gap-3 p-4">
      <div className="flex min-h-0 flex-1 gap-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={onChange}
          className="flex-1 resize-none border border-gray-300 p-2 font-mono"
          spellCheck={false}
        />
        <aside className="flex-1 border border-gray-300 p-2 text-gray-500 text-sm">Settings</aside>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleNew}
          disabled={!logIsValid}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          New
        </button>
        <button
          type="button"
          disabled
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Submit
        </button>
      </div>
      <div className="min-h-5 text-gray-600 text-sm" />
    </main>
  );
}
