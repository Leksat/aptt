import { TrayIcon } from "@tauri-apps/api/tray";
import { Effect } from "effect";
import { TrayInitError, TrayOpError } from "../errors";

const TRAY_ID = "main";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export class TrayService extends Effect.Service<TrayService>()("TrayService", {
  effect: Effect.gen(function* () {
    if (!isTauri) {
      return { setTitle: (_title: string | null) => Effect.void };
    }
    const tray = yield* Effect.tryPromise({
      try: async () => {
        const t = await TrayIcon.getById(TRAY_ID);
        if (!t) throw new Error(`tray '${TRAY_ID}' not found`);
        return t;
      },
      catch: (cause) => new TrayInitError({ cause }),
    });
    return {
      setTitle: (title: string | null) =>
        Effect.tryPromise({
          try: () => tray.setTitle(title ?? ""),
          catch: (cause) => new TrayOpError({ op: "setTitle", cause }),
        }),
    };
  }),
}) {}
