import { Effect } from "effect";
import { type SubmitResult, type SubmitState, submitTimeLog } from "../submit";
import type { TimeLog } from "../timeLog";
import type { SubmitterImpl } from "./Submitter";

const SUCCESS_LINGER_MS = 3000;

export class SubmitService extends Effect.Service<SubmitService>()("SubmitService", {
  effect: Effect.sync(() => {
    let state: SubmitState = { tag: "idle" };
    const listeners = new Set<() => void>();
    const notify = () => {
      for (const l of listeners) l();
    };
    const setState = (next: SubmitState) => {
      state = next;
      notify();
    };
    let lingerTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelLinger = () => {
      if (lingerTimer !== undefined) {
        clearTimeout(lingerTimer);
        lingerTimer = undefined;
      }
    };

    return {
      snapshot: (): SubmitState => state,
      subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      submit: (log: TimeLog, submitter: SubmitterImpl) =>
        Effect.gen(function* () {
          cancelLinger();
          setState({ tag: "submitting", current: 0, total: 0 });
          const result: SubmitResult = yield* submitTimeLog(
            log,
            submitter.parseTargetId,
            submitter.submit,
            (current, total) => setState({ tag: "submitting", current, total }),
          );
          if (result.tag === "ok") {
            setState({ tag: "success", total: result.submitted });
            lingerTimer = setTimeout(() => {
              lingerTimer = undefined;
              if (state.tag === "success") setState({ tag: "idle" });
            }, SUCCESS_LINGER_MS);
          } else {
            setState({ tag: "idle" });
          }
          return result;
        }),
    } as const;
  }),
}) {}
