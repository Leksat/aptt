import { Either } from "effect";
import { type ParseTargetId, totalBillableMinutes } from "./billable";
import type { SubmitState } from "./submit";
import { parseTimeLog } from "./timeLog";

export type Status =
  | { readonly tag: "submitting"; readonly current: number; readonly total: number }
  | { readonly tag: "success"; readonly total: number }
  | { readonly tag: "parseError"; readonly line: number; readonly message: string }
  | { readonly tag: "billable"; readonly minutes: number };

export const statusOf = (
  text: string,
  parseTargetId: ParseTargetId,
  submitState: SubmitState,
  now: Date,
): Status => {
  if (submitState.tag === "submitting") {
    return { tag: "submitting", current: submitState.current, total: submitState.total };
  }
  if (submitState.tag === "success") {
    return { tag: "success", total: submitState.total };
  }
  const parsed = parseTimeLog(text);
  if (Either.isLeft(parsed)) {
    return { tag: "parseError", line: parsed.left.line, message: parsed.left.message };
  }
  return { tag: "billable", minutes: totalBillableMinutes(parsed.right, parseTargetId, now) };
};
