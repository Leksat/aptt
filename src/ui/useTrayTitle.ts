import { Effect } from "effect";
import { useEffect } from "react";
import { entryCount } from "../core/entries";
import { runtime } from "../core/runtime";
import { TrayService } from "../core/services/TrayService";
import { surfaced } from "../core/surfaceError";

const setTitle = (title: string) =>
  surfaced(
    "Failed to set tray title",
    Effect.gen(function* () {
      const tray = yield* TrayService;
      yield* tray.setTitle(title);
    }),
  );

export const useTrayTitle = (text: string | null): void => {
  useEffect(() => {
    if (text === null) return;
    void runtime.runPromise(setTitle(String(entryCount(text))));
  }, [text]);
};
