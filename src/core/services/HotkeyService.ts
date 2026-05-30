import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { Effect } from "effect";
import { HotkeyRegisterError, HotkeyUnregisterError } from "../errors";

export class HotkeyService extends Effect.Service<HotkeyService>()("HotkeyService", {
  effect: Effect.succeed({
    register: (combo: string, onPressed: () => void) =>
      Effect.tryPromise({
        try: () =>
          register(combo, (event) => {
            if (event.state === "Pressed") onPressed();
          }),
        catch: (cause) => new HotkeyRegisterError({ combo, cause }),
      }),
    unregister: (combo: string) =>
      Effect.tryPromise({
        try: () => unregister(combo),
        catch: (cause) => new HotkeyUnregisterError({ combo, cause }),
      }),
  }),
}) {}
