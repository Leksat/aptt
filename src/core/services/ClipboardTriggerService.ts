import { Effect, Ref } from "effect";

export type TriggerAction = "none" | "magic" | "showWindow";

const WINDOW_MS = 500;

export class ClipboardTriggerService extends Effect.Service<ClipboardTriggerService>()(
  "ClipboardTriggerService",
  {
    effect: Effect.gen(function* () {
      const state = yield* Ref.make<{ count: number; lastAt: number | null }>({
        count: 0,
        lastAt: null,
      });
      return {
        process: (now: number) =>
          Ref.modify(state, (s) => {
            const withinWindow = s.lastAt !== null && now - s.lastAt < WINDOW_MS;
            const newCount = withinWindow ? s.count + 1 : 1;
            const action: TriggerAction =
              newCount === 2 ? "magic" : newCount === 3 ? "showWindow" : "none";
            const next =
              action === "none" ? { count: newCount, lastAt: now } : { count: 0, lastAt: null };
            return [action, next];
          }),
        reset: Ref.set(state, { count: 0, lastAt: null }),
      };
    }),
  },
) {}
