import { getCurrentWindow } from "@tauri-apps/api/window";
import { Effect } from "effect";
import { WindowOpError } from "../errors";

const win = () => getCurrentWindow();

const op = <A>(name: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new WindowOpError({ op: name, cause }),
  });

export class WindowService extends Effect.Service<WindowService>()("WindowService", {
  effect: Effect.succeed({
    show: op("show", () => win().show()),
    hide: op("hide", () => win().hide()),
    focus: op("focus", () => win().setFocus()),
    isVisible: op("isVisible", () => win().isVisible()),
    toggle: Effect.gen(function* () {
      const visible = yield* op("isVisible", () => win().isVisible());
      if (visible) {
        yield* op("hide", () => win().hide());
      } else {
        yield* op("show", () => win().show());
        yield* op("setFocus", () => win().setFocus());
      }
    }),
  }),
}) {}
