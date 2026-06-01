import { Effect, Either } from "effect";
import type { ParseTargetId } from "./billable";
import type { SubmitError } from "./errors";
import type { BillableEntry } from "./services/Submitter";
import type { ClosedTimeEntry, TimeLog } from "./timeLog";

export type SubmitState =
  | { readonly tag: "idle" }
  | { readonly tag: "submitting"; readonly current: number; readonly total: number }
  | { readonly tag: "success"; readonly total: number };

export interface SubmitOk {
  readonly tag: "ok";
  readonly log: TimeLog;
  readonly submitted: number;
}

export interface SubmitFailure {
  readonly tag: "error";
  readonly log: TimeLog;
  readonly submitted: number;
  readonly error: SubmitError;
}

export type SubmitResult = SubmitOk | SubmitFailure;

export type SubmitFn = (entry: BillableEntry) => Effect.Effect<void, SubmitError>;
export type OnProgress = (current: number, total: number) => void;

export const countBillable = (
  closed: readonly ClosedTimeEntry[],
  parseTargetId: ParseTargetId,
): number => {
  let n = 0;
  for (const entry of closed) {
    if (billableEntryOf(entry, parseTargetId) !== null) n += 1;
  }
  return n;
};

export const submitTimeLog = (
  log: TimeLog,
  parseTargetId: ParseTargetId,
  submit: SubmitFn,
  onProgress: OnProgress,
): Effect.Effect<SubmitResult> =>
  Effect.gen(function* () {
    const total = countBillable(log.closed, parseTargetId);
    let attempted = 0;

    for (let i = 0; i < log.closed.length; i++) {
      const entry = log.closed[i];
      if (entry === undefined) throw new Error("unreachable: closed index in range");
      const info = billableEntryOf(entry, parseTargetId);
      if (info === null) continue;
      attempted += 1;
      yield* Effect.sync(() => onProgress(attempted, total));
      const result = yield* Effect.either(submit(info));
      if (Either.isLeft(result)) {
        return {
          tag: "error",
          log: { closed: log.closed.slice(i), active: log.active },
          submitted: attempted - 1,
          error: result.left,
        } satisfies SubmitFailure;
      }
    }

    return {
      tag: "ok",
      log: { closed: [], active: log.active },
      submitted: total,
    } satisfies SubmitOk;
  });

const billableEntryOf = (
  entry: ClosedTimeEntry,
  parseTargetId: ParseTargetId,
): BillableEntry | null => {
  const trimmed = entry.description.trim();
  const firstSpace = trimmed.search(/\s/);
  const firstToken = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  if (firstToken === "") return null;
  const targetId = parseTargetId(firstToken);
  if (targetId === null) return null;
  const comment = firstSpace === -1 ? "" : trimmed.slice(firstSpace).trim();
  return { targetId, start: entry.start, end: entry.end, comment };
};
