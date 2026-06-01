import { Effect } from "effect";
import { useEffect } from "react";
import { runtime } from "../core/runtime";
import { TrayService } from "../core/services/TrayService";
import { surfaced } from "../core/surfaceError";

const setTitle = (title: string | null) =>
  surfaced(
    "Failed to set tray title",
    Effect.gen(function* () {
      const tray = yield* TrayService;
      yield* tray.setTitle(title);
    }),
  );

export const useTrayTitle = (title: string | null): void => {
  useEffect(() => {
    void runtime.runPromise(setTitle(title));
  }, [title]);
};
