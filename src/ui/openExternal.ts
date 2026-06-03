import { openUrl } from "@tauri-apps/plugin-opener";
import { Effect } from "effect";
import { runtime } from "../core/runtime";
import { surfaceError } from "../core/surfaceError";

export const openExternal = (url: string): void => {
  void runtime.runPromise(
    Effect.tryPromise({ try: () => openUrl(url), catch: (cause) => cause }).pipe(
      Effect.catchAll((cause) => surfaceError("Failed to open link", cause)),
    ),
  );
};
