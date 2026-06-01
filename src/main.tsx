import { listen } from "@tauri-apps/api/event";
import { Effect } from "effect";
import React from "react";
import ReactDOM from "react-dom/client";
import { runtime } from "./core/runtime";
import { HotkeyService } from "./core/services/HotkeyService";
import { WindowService } from "./core/services/WindowService";
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

const bootHotkeys = Effect.gen(function* () {
  const hotkeys = yield* HotkeyService;
  yield* hotkeys.register("cmd+alt+x", () => {
    void runtime.runPromise(toggleWindow);
  });
});

void runtime.runPromise(bootHotkeys);
void listen("window:show", () => {
  void runtime.runPromise(showAndFocus);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}
const root = ReactDOM.createRoot(rootElement);

void bootCore().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
