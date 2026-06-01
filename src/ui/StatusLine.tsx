import { Either } from "effect";
import { formatDurationShort, totalBillableMinutes } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { useMinuteTick } from "./useMinuteTick";
import { useParseTargetId } from "./useParseTargetId";

interface Props {
  readonly text: string;
}

export const StatusLine = ({ text }: Props) => {
  const now = useMinuteTick();
  const parseTargetId = useParseTargetId();
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
