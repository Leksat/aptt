import { hide as appHide } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Effect } from "effect";
import { WindowOpError } from "../errors";

const win = () => getCurrentWindow();

const op = <A>(name: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new WindowOpError({ op: name, cause }),
  });

const show = op("show", () => win().show());
const hide = op("app.hide", () => appHide());
const focus = op("setFocus", () => win().setFocus());
const isVisible = op("isVisible", () => win().isVisible());
const isFocused = op("isFocused", () => win().isFocused());

export class WindowService extends Effect.Service<WindowService>()("WindowService", {
  effect: Effect.succeed({
    showAndFocus: Effect.gen(function* () {
      yield* show;
      yield* focus;
    }),
    toggle: Effect.gen(function* () {
      if (!(yield* isVisible)) {
        yield* show;
        yield* focus;
      } else if (!(yield* isFocused)) {
        yield* focus;
      } else {
        yield* hide;
      }
    }),
  }),
}) {}
