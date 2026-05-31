import { Effect } from "effect";
import { useEffect } from "react";
import { entryCount } from "../core/entries";
import { runtime } from "../core/runtime";
import { TrayService } from "../core/services/TrayService";

const setTitle = (title: string) =>
  Effect.gen(function* () {
    const tray = yield* TrayService;
    yield* tray.setTitle(title);
  }).pipe(
    Effect.tapError((err) => Effect.logError(`Failed to set tray title: ${String(err)}`)),
    Effect.ignore,
  );

export const useTrayTitle = (text: string | null): void => {
  useEffect(() => {
    if (text === null) return;
    void runtime.runPromise(setTitle(String(entryCount(text))));
  }, [text]);
};
