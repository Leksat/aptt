import { formatDurationShort } from "../../core/billable";
import { Link } from "../Link";
import type { ExtendedInfo, TargetInfoState } from "./useExtendedInfo";

interface Props {
  readonly info: ExtendedInfo;
  readonly includeLocalInLogged: boolean;
  readonly onToggleIncludeLocalInLogged: (value: boolean) => void;
}

export const EntryDetails = ({
  info,
  includeLocalInLogged,
  onToggleIncludeLocalInLogged,
}: Props) => {
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
          sameTargetMinutes={info.sameTarget.minutes}
          includeLocalInLogged={includeLocalInLogged}
          onToggleIncludeLocalInLogged={onToggleIncludeLocalInLogged}
        />
      )}
      {showSameDescription && (
        <Card>
          <Row left="Same description" right={formatDurationShort(info.sameDescription.minutes)} />
        </Card>
      )}
      {showSameTarget && info.targetId !== null && (
        <Card>
          <Row
            left={`Same target (${info.targetId})`}
            right={formatDurationShort(info.sameTarget.minutes)}
          />
        </Card>
      )}
    </div>
  );
};

interface JiraCardProps {
  readonly targetId: string;
  readonly state: TargetInfoState;
  readonly sameTargetMinutes: number;
  readonly includeLocalInLogged: boolean;
  readonly onToggleIncludeLocalInLogged: (value: boolean) => void;
}

const JiraCard = ({
  targetId,
  state,
  sameTargetMinutes,
  includeLocalInLogged,
  onToggleIncludeLocalInLogged,
}: JiraCardProps) => {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <TitleRow targetId={targetId} state={state} />
        {state.kind === "ok" &&
          (state.info.estimateMinutes !== null || state.info.loggedMinutes > 0) && (
            <EstimateRows
              estimateMinutes={state.info.estimateMinutes}
              loggedMinutes={state.info.loggedMinutes}
              sameTargetMinutes={sameTargetMinutes}
              includeLocalInLogged={includeLocalInLogged}
            />
          )}
        {state.kind === "ok" &&
          (state.info.estimateMinutes !== null || state.info.loggedMinutes > 0) && (
            <Toggle
              value={includeLocalInLogged}
              onChange={onToggleIncludeLocalInLogged}
              leftLabel="Jira only"
              rightLabel="Jira + local"
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
  readonly loggedMinutes: number;
  readonly sameTargetMinutes: number;
  readonly includeLocalInLogged: boolean;
}

const EstimateRows = ({
  estimateMinutes,
  loggedMinutes,
  sameTargetMinutes,
  includeLocalInLogged,
}: EstimateRowsProps) => {
  const logged = loggedMinutes + (includeLocalInLogged ? sameTargetMinutes : 0);
  return (
    <div className="flex flex-col">
      {estimateMinutes !== null && (
        <Row left="Estimated" right={formatDurationShort(estimateMinutes)} />
      )}
      <Row left="Logged" right={formatDurationShort(logged)} />
      {estimateMinutes !== null && (
        <Row left="Remaining" right={formatDurationShort(estimateMinutes - logged)} />
      )}
    </div>
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

interface ToggleProps {
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
  readonly leftLabel: string;
  readonly rightLabel: string;
}

const Toggle = ({ value, onChange, leftLabel, rightLabel }: ToggleProps) => (
  <div className="flex items-center justify-end gap-2 text-xs">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={value ? "text-[var(--color-muted)]" : ""}
    >
      {leftLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="relative inline-flex h-4 w-8 items-center rounded-full border border-[var(--color-border)]"
    >
      <span
        className="inline-block h-3 w-3 rounded-full bg-[var(--color-text)] transition-transform"
        style={{ transform: value ? "translateX(16px)" : "translateX(2px)" }}
      />
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={value ? "" : "text-[var(--color-muted)]"}
    >
      {rightLabel}
    </button>
  </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
    {children}
  </div>
);
