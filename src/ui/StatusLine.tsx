import { Either } from "effect";
import { formatDurationShort, totalBillableMinutes } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { useMinuteTick } from "./useMinuteTick";
import { useParseTargetId } from "./useParseTargetId";
import type { SubmitState } from "./useSubmit";

interface Props {
  readonly text: string;
  readonly submitState: SubmitState;
}

export const StatusLine = ({ text, submitState }: Props) => {
  const now = useMinuteTick();
  const parseTargetId = useParseTargetId();

  if (submitState.tag === "submitting") {
    return (
      <div className="min-h-5 text-gray-600 text-sm">
        Submitting {submitState.current}/{submitState.total}…
      </div>
    );
  }
  if (submitState.tag === "success") {
    return (
      <div className="min-h-5 text-gray-600 text-sm">
        Submitted {submitState.total} {submitState.total === 1 ? "entry" : "entries"}
      </div>
    );
  }

  const parsed = parseTimeLog(text);
  if (Either.isLeft(parsed)) {
    return (
      <div className="min-h-5 text-red-600 text-sm">
        Line {parsed.left.line}: {parsed.left.message}
      </div>
    );
  }
  const minutes = totalBillableMinutes(parsed.right, parseTargetId, now);
  return (
    <div className="min-h-5 text-gray-600 text-sm">
      Total billable: {formatDurationShort(minutes)}
    </div>
  );
};
