import { listen } from "@tauri-apps/api/event";
import { Effect } from "effect";
import React from "react";
import ReactDOM from "react-dom/client";
import { runtime } from "./core/runtime";
import { HotkeyService } from "./core/services/HotkeyService";
import { WindowService } from "./core/services/WindowService";
import { surfaced, surfaceError } from "./core/surfaceError";
import App from "./ui/App";
import { bootCore } from "./ui/useCore";
import "./ui/index.css";

const toggleWindow = Effect.gen(function* () {
  const window = yield* WindowService;
  yield* window.toggle;
});

const showAndFocus = Effect.gen(function* () {
  const window = yield* WindowService;
  yield* window.showAndFocus;
});

const HOTKEY = "cmd+alt+x";

const bootHotkeys = Effect.gen(function* () {
  const hotkeys = yield* HotkeyService;
  yield* hotkeys.unregister(HOTKEY).pipe(Effect.ignore);
  yield* hotkeys.register(HOTKEY, () => {
    void runtime.runPromise(surfaced("hotkey toggleWindow", toggleWindow));
  });
});

const setupListen = Effect.tryPromise({
  try: () =>
    listen("window:show", () => {
      void runtime.runPromise(surfaced("window:show", showAndFocus));
    }),
  catch: (cause) => cause,
});

void runtime.runPromise(surfaced("hotkey boot", bootHotkeys));
const listenPromise = runtime.runPromise(surfaced("window:show listen", setupListen));

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    const unlisten = await listenPromise;
    if (unlisten !== undefined) unlisten();
    await runtime.runPromise(
      surfaced(
        "hotkey HMR cleanup",
        Effect.gen(function* () {
          const hotkeys = yield* HotkeyService;
          yield* hotkeys.unregister(HOTKEY).pipe(Effect.ignore);
        }),
      ),
    );
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}
const root = ReactDOM.createRoot(rootElement);

bootCore().then(
  () => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  },
  (cause: unknown) => {
    void runtime.runPromise(surfaceError("bootCore failed", cause));
  },
);
