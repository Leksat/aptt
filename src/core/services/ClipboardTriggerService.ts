import { Effect, Ref } from "effect";

export type TriggerAction = "none" | "capture" | "showWindow";

const WINDOW_MS = 500;

interface State {
  readonly count: number;
  readonly lastAt: number | null;
  readonly captureArmed: boolean;
}

const initial: State = { count: 0, lastAt: null, captureArmed: false };

export class ClipboardTriggerService extends Effect.Service<ClipboardTriggerService>()(
  "ClipboardTriggerService",
  {
    effect: Effect.gen(function* () {
      const state = yield* Ref.make<State>(initial);
      return {
        process: (now: number) =>
          Ref.modify(state, (s) => {
            const withinWindow = s.lastAt !== null && now - s.lastAt < WINDOW_MS;
            if (!withinWindow) {
              return ["none", { count: 1, lastAt: now, captureArmed: false }];
            }
            const next = s.count + 1;
            if (next === 2) {
              return ["capture", { count: 2, lastAt: now, captureArmed: false }];
            }
            if (next === 3 && s.captureArmed) {
              return ["showWindow", initial];
            }
            return ["none", { count: next, lastAt: now, captureArmed: false }];
          }),
        armSuccess: Ref.update(state, (s) => ({ ...s, captureArmed: true })),
        reset: Ref.set(state, initial),
      };
    }),
  },
) {}
