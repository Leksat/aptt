import type { HttpClient } from "@effect/platform";
import { Effect, Either } from "effect";
import type { SubmitterImpl, WeekRange } from "./Submitter";

export type WeekTotalsState =
  | { readonly tag: "pending" }
  | { readonly tag: "unavailable" }
  | { readonly tag: "error" }
  | { readonly tag: "loaded"; readonly loggedMinutes: number; readonly requiredMinutes: number };

export class WeekTotalsService extends Effect.Service<WeekTotalsService>()("WeekTotalsService", {
  effect: Effect.gen(function* () {
    let state: WeekTotalsState = { tag: "pending" };
    const listeners = new Set<() => void>();
    const setState = (next: WeekTotalsState) => {
      state = next;
      for (const l of listeners) l();
    };

    return {
      snapshot: (): WeekTotalsState => state,
      subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      refresh: (
        submitter: SubmitterImpl,
        range: WeekRange,
      ): Effect.Effect<void, never, HttpClient.HttpClient> =>
        Effect.gen(function* () {
          const result = yield* Effect.either(submitter.fetchWeekTotals(range));
          if (Either.isLeft(result)) {
            setState({ tag: "error" });
            return;
          }
          const totals = result.right;
          setState(
            totals === null
              ? { tag: "unavailable" }
              : {
                  tag: "loaded",
                  loggedMinutes: totals.loggedMinutes,
                  requiredMinutes: totals.requiredMinutes,
                },
          );
        }),
    } as const;
  }),
}) {}
