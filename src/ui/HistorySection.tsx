import { Either } from "effect";
import { useEffect, useState } from "react";
import type { FindTicketId } from "../core/billable";
import { closedBillableMinutes, formatDurationShort } from "../core/billable";
import { historyTitle } from "../core/history";
import type { Backend } from "../core/services/Backend";
import { parseTimeLog, type TimeLog } from "../core/timeLog";
import { EntryDetails } from "./entryPane/EntryDetails";
import { EntryTooltip } from "./entryPane/EntryTooltip";
import { entryAtStartLine } from "./entryPane/focusedEntry";
import { useTicketPopup } from "./entryPane/ticketPopup";
import { type ExtendedInfoTarget, useExtendedInfo } from "./entryPane/useExtendedInfo";
import { useFocusedSource } from "./FocusedSourceContext";
import { HistoryEntryEditor } from "./HistoryEntryEditor";

interface Props {
  readonly filename: string;
  readonly submittedAt: Date;
  readonly defaultExpanded: boolean;
  readonly now: Date;
  readonly backend: Backend;
  readonly read: (filename: string) => Promise<string>;
}

type Content =
  | { readonly kind: "loading" }
  | { readonly kind: "parsed"; readonly text: string; readonly log: TimeLog }
  | { readonly kind: "raw"; readonly text: string }
  | { readonly kind: "error" };

const emptyLog: TimeLog = { closed: [], active: null };
const noTicketId = () => null;
const noTicketUrl = () => null;

export const HistorySection = ({
  filename,
  submittedAt,
  defaultExpanded,
  now,
  backend,
  read,
}: Props) => {
  const [open, setOpen] = useState(defaultExpanded);
  const [content, setContent] = useState<Content>({ kind: "loading" });

  useEffect(() => {
    if (!open || content.kind !== "loading") return;
    let cancelled = false;
    void read(filename).then(
      (text) => {
        if (cancelled) return;
        const parsed = parseTimeLog(text);
        setContent(
          Either.isRight(parsed)
            ? { kind: "parsed", text, log: { closed: parsed.right.closed, active: null } }
            : { kind: "raw", text },
        );
      },
      () => {
        if (!cancelled) setContent({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, content.kind, filename, read]);

  const billable =
    content.kind === "parsed" ? closedBillableMinutes(content.log, backend.findTicketId) : null;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="border-[var(--color-border)] border-b"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--color-surface)] [&::-webkit-details-marker]:hidden">
        <span>{historyTitle(submittedAt, now)}</span>
        {billable !== null && (
          <span className="text-[var(--color-muted)]">{formatDurationShort(billable)}</span>
        )}
      </summary>
      {open && (
        <div className="px-3 pt-1 pb-3">
          {content.kind === "loading" && <Muted>Loading...</Muted>}
          {content.kind === "error" && <Muted>Failed to read this file.</Muted>}
          {content.kind === "parsed" && (
            <ExpandedHistory
              text={content.text}
              log={content.log}
              findTicketId={backend.findTicketId}
              ticketUrl={backend.ticketUrl}
              now={now}
              backend={backend}
              selectable={true}
            />
          )}
          {content.kind === "raw" && (
            <ExpandedHistory
              text={content.text}
              log={emptyLog}
              findTicketId={noTicketId}
              ticketUrl={noTicketUrl}
              now={now}
              backend={backend}
              selectable={false}
            />
          )}
        </div>
      )}
    </details>
  );
};

interface ExpandedProps {
  readonly text: string;
  readonly log: TimeLog;
  readonly findTicketId: FindTicketId;
  readonly ticketUrl: (ticketId: string) => string | null;
  readonly now: Date;
  readonly backend: Backend;
  readonly selectable: boolean;
}

const noop = () => {};

const ExpandedHistory = ({
  text,
  log,
  findTicketId,
  ticketUrl,
  now,
  backend,
  selectable,
}: ExpandedProps) => {
  const popup = useTicketPopup();
  const focused = useFocusedSource();
  const target: ExtendedInfoTarget | null =
    popup.target === null || popup.target.kind === "ticket"
      ? null
      : mapEntryTarget(log, popup.target.startLine);
  const extendedInfo = useExtendedInfo({ log, target, now, backend });

  const onCaretChange = selectable
    ? (caret: number) => focused.set({ source: "history", caret, text })
    : noop;
  const onBlur = selectable ? () => focused.set((s) => (s?.source === "history" ? null : s)) : noop;

  return (
    <>
      <HistoryEntryEditor
        text={text}
        log={log}
        findTicketId={findTicketId}
        ticketUrl={ticketUrl}
        onOpenEntry={popup.actions.openEntry}
        onCaretChange={onCaretChange}
        onBlur={onBlur}
      />
      {popup.anchor !== null && extendedInfo !== null && (
        <EntryTooltip
          anchor={popup.anchor}
          onDismiss={popup.dismiss}
          onMouseEnter={popup.onPopupMouseEnter}
          onMouseLeave={popup.onPopupMouseLeave}
        >
          <EntryDetails info={extendedInfo} mode="history" />
        </EntryTooltip>
      )}
    </>
  );
};

const mapEntryTarget = (log: TimeLog, startLine: number): ExtendedInfoTarget | null => {
  const focused = entryAtStartLine(log, startLine);
  return focused === null ? null : { kind: "entry", focused };
};

const Muted = ({ children }: { children: string }) => (
  <div className="text-[var(--color-muted)]">{children}</div>
);
