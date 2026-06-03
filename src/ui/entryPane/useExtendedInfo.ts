import { Effect, Either } from "effect";
import { useEffect, useRef, useState } from "react";
import { parseBillable } from "../../core/billable";
import { runtime } from "../../core/runtime";
import type { SubmitterImpl, TargetInfo } from "../../core/services/Submitter";
import type { TimeLog } from "../../core/timeLog";
import type { FocusedEntry } from "./focusedEntry";

export type TargetInfoState =
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly info: TargetInfo }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "absent" };

export interface ExtendedInfoAggregate {
  readonly count: number;
  readonly minutes: number;
}

export interface ExtendedInfo {
  readonly targetId: string | null;
  readonly targetInfo: TargetInfoState | null;
  readonly sameDescription: ExtendedInfoAggregate;
  readonly sameTarget: ExtendedInfoAggregate;
}

interface Args {
  readonly log: TimeLog;
  readonly focused: FocusedEntry | null;
  readonly now: Date;
  readonly submitter: SubmitterImpl;
}

export const useExtendedInfo = ({ log, focused, now, submitter }: Args): ExtendedInfo | null => {
  const description = focused === null ? "" : focused.entry.description;
  const targetId =
    focused === null
      ? null
      : (parseBillable(description, submitter.findTargetId)?.targetId ?? null);
  const submitterRef = useRef(submitter);
  submitterRef.current = submitter;

  const [targetInfoState, setTargetInfoState] = useState<TargetInfoState | null>(null);

  useEffect(() => {
    if (targetId === null) {
      setTargetInfoState(null);
      return;
    }
    let cancelled = false;
    setTargetInfoState({ kind: "loading" });
    void runtime
      .runPromise(Effect.either(submitterRef.current.fetchTargetInfo(targetId)))
      .then((result) => {
        if (cancelled) return;
        if (Either.isLeft(result)) {
          setTargetInfoState({ kind: "error", message: String(result.left.cause) });
          return;
        }
        if (result.right === null) {
          setTargetInfoState({ kind: "absent" });
          return;
        }
        setTargetInfoState({ kind: "ok", info: result.right });
      });
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  if (focused === null) return null;

  return {
    targetId,
    targetInfo: targetInfoState,
    sameDescription: aggregate(log, now, (d) => d.trim() === description.trim()),
    sameTarget:
      targetId === null
        ? { count: 0, minutes: 0 }
        : aggregate(
            log,
            now,
            (d) => parseBillable(d, submitter.findTargetId)?.targetId === targetId,
          ),
  };
};

const aggregate = (
  log: TimeLog,
  now: Date,
  matches: (description: string) => boolean,
): ExtendedInfoAggregate => {
  let count = 0;
  let minutes = 0;
  for (const entry of log.closed) {
    if (!matches(entry.description)) continue;
    count += 1;
    minutes += diffMinutes(entry.start, entry.end);
  }
  if (log.active !== null && matches(log.active.description)) {
    count += 1;
    minutes += diffMinutes(log.active.start, floorToMinute(now));
  }
  return { count, minutes };
};

const diffMinutes = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / 60_000);

const floorToMinute = (d: Date): Date => {
  const result = new Date(d);
  result.setSeconds(0, 0);
  return result;
};
