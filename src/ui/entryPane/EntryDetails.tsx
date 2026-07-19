import { formatDurationShort } from "../../core/billable";
import type { ExtendedInfo, ExtendedInfoAggregate, TicketInfoState } from "./useExtendedInfo";

interface Props {
  readonly info: ExtendedInfo;
}

export const EntryDetails = ({ info }: Props) => {
  const showJiraCard =
    info.ticketId !== null && info.ticketInfo !== null && info.ticketInfo.kind !== "absent";
  const showSameDescription = info.sameDescription !== null && info.sameDescription.count >= 2;
  const showSameTicket =
    info.ticketId !== null &&
    info.sameTicket !== null &&
    info.sameTicket.count >= (info.kind === "entry" ? 2 : 1);

  if (!showJiraCard && !showSameDescription && !showSameTicket) {
    return <div className="text-[var(--color-muted)]">No info for this ticket</div>;
  }

  const showStats =
    info.ticketInfo !== null &&
    info.ticketInfo.kind === "ok" &&
    (info.ticketInfo.info.estimateMinutes !== null || info.ticketInfo.info.loggedMinutes > 0);

  return (
    <div className="flex flex-col gap-3">
      {showJiraCard && info.ticketInfo !== null && (
        <Card>
          <TitleRow state={info.ticketInfo} />
        </Card>
      )}
      {showStats && info.ticketInfo !== null && info.ticketInfo.kind === "ok" && (
        <Card>
          <EstimateRows
            estimateMinutes={info.ticketInfo.info.estimateMinutes}
            remoteMinutes={info.ticketInfo.info.loggedMinutes}
            localMinutes={info.localMinutes}
          />
        </Card>
      )}
      {showSameDescription && info.sameDescription !== null && (
        <Card>
          <Row left="Same description" right={splitFormula(info.sameDescription)} />
        </Card>
      )}
      {showSameTicket && info.ticketId !== null && info.sameTicket !== null && (
        <Card>
          <Row left={`Same ticket (${info.ticketId})`} right={splitFormula(info.sameTicket)} />
        </Card>
      )}
    </div>
  );
};

const TitleRow = ({ state }: { state: TicketInfoState }) => {
  if (state.kind === "loading") {
    return <SkeletonLine width="60%" />;
  }
  if (state.kind === "error") {
    return <span className="text-[var(--color-attention)]">{state.message}</span>;
  }
  if (state.kind === "absent") return null;
  return <span className="font-medium">{state.info.title}</span>;
};

interface EstimateRowsProps {
  readonly estimateMinutes: number | null;
  readonly remoteMinutes: number;
  readonly localMinutes: number;
}

const EstimateRows = ({ estimateMinutes, remoteMinutes, localMinutes }: EstimateRowsProps) => {
  const logged = localMinutes + remoteMinutes;
  return (
    <div className="flex flex-col">
      {estimateMinutes !== null && (
        <Row left="Estimated" right={formatDurationShort(estimateMinutes)} />
      )}
      <Row left="Logged" right={sumFormula(localMinutes, remoteMinutes)} />
      {estimateMinutes !== null && (
        <Row left="Remaining" right={formatDurationShort(estimateMinutes - logged)} />
      )}
    </div>
  );
};

const splitFormula = (agg: ExtendedInfoAggregate): string =>
  sumFormula(agg.focusedMinutes, agg.minutes - agg.focusedMinutes);

const sumFormula = (current: number, other: number): string => {
  if (current === 0 || other === 0) {
    return formatDurationShort(current + other);
  }
  return (
    `${formatDurationShort(current)} + ${formatDurationShort(other)}` +
    ` = ${formatDurationShort(current + other)}`
  );
};

const Row = ({ left, right }: { left: string; right: string }) => (
  <div className="flex items-center justify-between gap-2">
    <span>{left}</span>
    <span>{right}</span>
  </div>
);

const SkeletonLine = ({ width }: { width: string }) => (
  <span
    className="inline-block h-4 animate-pulse rounded bg-[var(--color-border)]"
    style={{ width }}
  />
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
    {children}
  </div>
);
