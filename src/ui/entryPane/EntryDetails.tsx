import { formatDurationShort } from "../../core/billable";
import { Link } from "../Link";
import type { ExtendedInfo, ExtendedInfoAggregate, TargetInfoState } from "./useExtendedInfo";

interface Props {
  readonly info: ExtendedInfo;
}

export const EntryDetails = ({ info }: Props) => {
  const showJiraCard =
    info.targetId !== null && info.targetInfo !== null && info.targetInfo.kind !== "absent";
  const showSameDescription = info.sameDescription.count >= 2;
  const showSameTarget = info.targetId !== null && info.sameTarget.count >= 2;

  if (!showJiraCard && !showSameDescription && !showSameTarget) {
    return <div className="text-[var(--color-muted)]">No info for this entry</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {showJiraCard && info.targetId !== null && info.targetInfo !== null && (
        <JiraCard
          targetId={info.targetId}
          state={info.targetInfo}
          localMinutes={info.sameTarget.minutes}
        />
      )}
      {showSameDescription && (
        <Card>
          <Row left="Same description" right={splitFormula(info.sameDescription)} />
        </Card>
      )}
      {showSameTarget && info.targetId !== null && (
        <Card>
          <Row left={`Same target (${info.targetId})`} right={splitFormula(info.sameTarget)} />
        </Card>
      )}
    </div>
  );
};

interface JiraCardProps {
  readonly targetId: string;
  readonly state: TargetInfoState;
  readonly localMinutes: number;
}

const JiraCard = ({ targetId, state, localMinutes }: JiraCardProps) => {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <TitleRow targetId={targetId} state={state} />
        {state.kind === "ok" &&
          (state.info.estimateMinutes !== null || state.info.loggedMinutes > 0) && (
            <EstimateRows
              estimateMinutes={state.info.estimateMinutes}
              remoteMinutes={state.info.loggedMinutes}
              localMinutes={localMinutes}
            />
          )}
      </div>
    </Card>
  );
};

const TitleRow = ({ targetId, state }: { targetId: string; state: TargetInfoState }) => {
  if (state.kind === "loading") {
    return <SkeletonLine width="60%" />;
  }
  if (state.kind === "error") {
    return <span className="text-[var(--color-attention)]">{state.message}</span>;
  }
  if (state.kind === "absent") return null;
  return (
    <Link href={state.info.url}>
      [{targetId}] {state.info.title}
    </Link>
  );
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
