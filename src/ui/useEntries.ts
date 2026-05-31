import { Effect } from "effect";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { runtime } from "../core/runtime";
import { FileService } from "../core/services/FileService";

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

export interface UseEntries {
  readonly text: string | null;
  readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const useEntries = (): UseEntries => {
  const [text, setText] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void runtime.runPromise(loadEntries).then(setText);
  }, []);

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void runtime.runPromise(saveEntries(value));
    }, SAVE_DEBOUNCE_MS);
  };

  return { text, onChange };
};
