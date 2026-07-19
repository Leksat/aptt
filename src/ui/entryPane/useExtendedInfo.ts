import { Effect, Either } from "effect";
import { useEffect, useRef, useState } from "react";
import { parseBillable } from "../../core/billable";
import { runtime } from "../../core/runtime";
import type { SubmitterImpl, TicketInfo } from "../../core/services/Submitter";
import type { TimeLog } from "../../core/timeLog";
import type { FocusedEntry } from "./focusedEntry";

export type TicketInfoState =
  | { readonly kind: "loading" }
  | { readonly kind: "ok"; readonly info: TicketInfo }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "absent" };

export interface ExtendedInfoAggregate {
  readonly count: number;
  readonly minutes: number;
  readonly focusedMinutes: number;
}

export interface ExtendedInfo {
  readonly ticketId: string | null;
  readonly ticketInfo: TicketInfoState | null;
  readonly sameDescription: ExtendedInfoAggregate;
  readonly sameTicket: ExtendedInfoAggregate;
}

interface Args {
  readonly log: TimeLog;
  readonly focused: FocusedEntry | null;
  readonly now: Date;
  readonly submitter: SubmitterImpl;
}

export const useExtendedInfo = ({ log, focused, now, submitter }: Args): ExtendedInfo | null => {
  const description = focused === null ? "" : focused.entry.description;
  const ticketId =
    focused === null
      ? null
      : (parseBillable(description, submitter.findTicketId)?.ticketId ?? null);
  const submitterRef = useRef(submitter);
  submitterRef.current = submitter;

  const [ticketInfoState, setTicketInfoState] = useState<TicketInfoState | null>(null);

  useEffect(() => {
    if (ticketId === null) {
      setTicketInfoState(null);
      return;
    }
    let cancelled = false;
    setTicketInfoState({ kind: "loading" });
    void runtime
      .runPromise(Effect.either(submitterRef.current.fetchTicketInfo(ticketId)))
      .then((result) => {
        if (cancelled) return;
        if (Either.isLeft(result)) {
          setTicketInfoState({ kind: "error", message: String(result.left.cause) });
          return;
        }
        if (result.right === null) {
          setTicketInfoState({ kind: "absent" });
          return;
        }
        setTicketInfoState({ kind: "ok", info: result.right });
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  if (focused === null) return null;

  const focusedMinutes =
    focused.kind === "closed"
      ? diffMinutes(focused.entry.start, focused.entry.end)
      : diffMinutes(focused.entry.start, floorToMinute(now));

  return {
    ticketId,
    ticketInfo: ticketInfoState,
    sameDescription: aggregate(log, now, focusedMinutes, (d) => d.trim() === description.trim()),
    sameTicket:
      ticketId === null
        ? { count: 0, minutes: 0, focusedMinutes: 0 }
        : aggregate(
            log,
            now,
            focusedMinutes,
            (d) => parseBillable(d, submitter.findTicketId)?.ticketId === ticketId,
          ),
  };
};

const aggregate = (
  log: TimeLog,
  now: Date,
  focusedMinutes: number,
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
  return { count, minutes, focusedMinutes };
};

const diffMinutes = (start: Date, end: Date): number =>
  Math.floor((end.getTime() - start.getTime()) / 60_000);

const floorToMinute = (d: Date): Date => {
  const result = new Date(d);
  result.setSeconds(0, 0);
  return result;
};
