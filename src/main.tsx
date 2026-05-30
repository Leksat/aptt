import { Effect } from "effect";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { runtime } from "./core/runtime";
import { HotkeyService } from "./core/services/HotkeyService";
import { WindowService } from "./core/services/WindowService";
import "./index.css";

const toggleWindow = Effect.gen(function* () {
  const window = yield* WindowService;
  yield* window.toggle;
});

const bootHotkeys = Effect.gen(function* () {
  const hotkeys = yield* HotkeyService;
  yield* hotkeys.register("cmd+alt+x", () => {
    void runtime.runPromise(toggleWindow);
  });
});

void runtime.runPromise(bootHotkeys);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
