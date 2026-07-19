import type { HttpClient } from "@effect/platform";
import { Effect, Either } from "effect";
import { type FindTicketId, parseBillable } from "./billable";
import type { SubmitError } from "./errors";
import type { BillableEntry } from "./services/Backend";
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

export type SubmitFn = (
  entry: BillableEntry,
) => Effect.Effect<void, SubmitError, HttpClient.HttpClient>;
export type OnProgress = (current: number, total: number) => void;

export const countBillable = (
  closed: readonly ClosedTimeEntry[],
  findTicketId: FindTicketId,
): number => {
  let n = 0;
  for (const entry of closed) {
    if (billableEntryOf(entry, findTicketId) !== null) n += 1;
  }
  return n;
};

export const submitTimeLog = (
  log: TimeLog,
  findTicketId: FindTicketId,
  submit: SubmitFn,
  onProgress: OnProgress,
): Effect.Effect<SubmitResult, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const total = countBillable(log.closed, findTicketId);
    let attempted = 0;

    for (let i = 0; i < log.closed.length; i++) {
      const entry = log.closed[i];
      if (entry === undefined) throw new Error("unreachable: closed index in range");
      const info = billableEntryOf(entry, findTicketId);
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
  findTicketId: FindTicketId,
): BillableEntry | null => {
  const parsed = parseBillable(entry.description, findTicketId);
  if (parsed === null) return null;
  return {
    ticketId: parsed.ticketId,
    start: entry.start,
    end: entry.end,
    description: parsed.tail,
  };
};
