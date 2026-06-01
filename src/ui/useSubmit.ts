import { Effect } from "effect";
import { useRef, useState } from "react";
import { runtime } from "../core/runtime";
import { Submitter } from "../core/services/Submitter";
import { type SubmitResult, submitTimeLog } from "../core/submit";
import type { TimeLog } from "../core/timeLog";
import { showError } from "./showError";

export type SubmitState =
  | { readonly tag: "idle" }
  | { readonly tag: "submitting"; readonly current: number; readonly total: number }
  | { readonly tag: "success"; readonly total: number };

export interface UseSubmit {
  readonly state: SubmitState;
  readonly isInFlight: boolean;
  readonly submit: (log: TimeLog) => Promise<SubmitResult>;
}

const SUCCESS_LINGER_MS = 3000;

export const useSubmit = (): UseSubmit => {
  const [state, setState] = useState<SubmitState>({ tag: "idle" });
  const lingerTimerRef = useRef<number | undefined>(undefined);

  const cancelLinger = () => {
    if (lingerTimerRef.current !== undefined) {
      window.clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = undefined;
    }
  };

  const submit = async (log: TimeLog): Promise<SubmitResult> => {
    cancelLinger();
    setState({ tag: "submitting", current: 0, total: 0 });
    const program = Effect.gen(function* () {
      const submitter = yield* Submitter;
      return yield* submitTimeLog(
        log,
        submitter.parseTargetId,
        submitter.submit,
        (current, total) => setState({ tag: "submitting", current, total }),
      );
    });
    const result = await runtime.runPromise(program);
    if (result.tag === "ok") {
      setState({ tag: "success", total: result.submitted });
      lingerTimerRef.current = window.setTimeout(() => {
        lingerTimerRef.current = undefined;
        setState((s) => (s.tag === "success" ? { tag: "idle" } : s));
      }, SUCCESS_LINGER_MS);
    } else {
      setState({ tag: "idle" });
      showError(`Submit failed: ${String(result.error.cause)}`);
    }
    return result;
  };

  return { state, isInFlight: state.tag === "submitting", submit };
};
