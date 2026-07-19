import { Effect, Either } from "effect";
import { useEffect, useRef, useState } from "react";
import { parseBillable } from "../../core/billable";
import { runtime } from "../../core/runtime";
import type { Backend, TicketInfo } from "../../core/services/Backend";
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
  readonly kind: "entry" | "ticket";
  readonly ticketId: string | null;
  readonly ticketInfo: TicketInfoState | null;
  readonly localMinutes: number;
  readonly sameDescription: ExtendedInfoAggregate | null;
  readonly sameTicket: ExtendedInfoAggregate | null;
}

export type ExtendedInfoTarget =
  | { readonly kind: "entry"; readonly focused: FocusedEntry }
  | { readonly kind: "ticket"; readonly ticketId: string };

interface Args {
  readonly log: TimeLog;
  readonly target: ExtendedInfoTarget | null;
  readonly now: Date;
  readonly backend: Backend;
}

export const useExtendedInfo = ({ log, target, now, backend }: Args): ExtendedInfo | null => {
  const ticketId = targetTicketId(target, backend);
  const backendRef = useRef(backend);
  backendRef.current = backend;

  const [ticketInfoState, setTicketInfoState] = useState<TicketInfoState | null>(null);

  useEffect(() => {
    if (ticketId === null) {
      setTicketInfoState(null);
      return;
    }
    let cancelled = false;
    setTicketInfoState({ kind: "loading" });
    void runtime
      .runPromise(Effect.either(backendRef.current.fetchTicketInfo(ticketId)))
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

  if (target === null) return null;

  const focusedMinutes = target.kind === "entry" ? entryMinutes(target.focused, now) : 0;
  const localAggregate =
    ticketId === null
      ? null
      : aggregate(
          log,
          now,
          focusedMinutes,
          (d) => parseBillable(d, backend.findTicketId)?.ticketId === ticketId,
        );

  return {
    kind: target.kind,
    ticketId,
    ticketInfo: ticketInfoState,
    localMinutes: localAggregate?.minutes ?? 0,
    sameDescription:
      target.kind === "entry"
        ? aggregate(
            log,
            now,
            focusedMinutes,
            (d) => d.trim() === target.focused.entry.description.trim(),
          )
        : null,
    sameTicket: localAggregate,
  };
};

const targetTicketId = (target: ExtendedInfoTarget | null, backend: Backend): string | null => {
  if (target === null) return null;
  if (target.kind === "ticket") return target.ticketId;
  return parseBillable(target.focused.entry.description, backend.findTicketId)?.ticketId ?? null;
};

const entryMinutes = (focused: FocusedEntry, now: Date): number =>
  focused.kind === "closed"
    ? diffMinutes(focused.entry.start, focused.entry.end)
    : diffMinutes(focused.entry.start, floorToMinute(now));

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
