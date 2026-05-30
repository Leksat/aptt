import { Effect } from "effect";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { runtime } from "./core/runtime";
import { FileService } from "./core/services/FileService";

const SAVE_DEBOUNCE_MS = 300;

const loadEntries = Effect.gen(function* () {
  const fs = yield* FileService;
  return yield* fs.readEntries;
}).pipe(
  Effect.tapError((err) => Effect.logError(`Failed to load entries: ${String(err)}`)),
  Effect.orElseSucceed(() => ""),
);

const saveEntries = (text: string) =>
  Effect.gen(function* () {
    const fs = yield* FileService;
    yield* fs.writeEntries(text);
  }).pipe(
    Effect.tapError((err) => Effect.logError(`Failed to save entries: ${String(err)}`)),
    Effect.ignore,
  );

export default function App() {
  const [text, setText] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void runtime.runPromise(loadEntries).then(setText);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void runtime.runPromise(saveEntries(value));
    }, SAVE_DEBOUNCE_MS);
  };

  if (text === null) {
    return <main className="p-4">Loading…</main>;
  }

  return (
    <main className="h-screen p-4">
      <textarea
        value={text}
        onChange={handleChange}
        className="h-full w-full resize-none border border-gray-300 p-2 font-mono"
        spellCheck={false}
      />
    </main>
  );
}
