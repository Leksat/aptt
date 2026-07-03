import { Either } from "effect";
import { totalBillableMinutes } from "../core/billable";
import { parseTimeLog } from "../core/timeLog";
import { useCore } from "./useCore";
import { useMinuteTick } from "./useMinuteTick";

export type WeekProgress =
  | { readonly tag: "cannotFetch" }
  | {
      readonly tag: "loaded";
      readonly billableMinutes: number;
      readonly loggedMinutes: number;
      readonly requiredMinutes: number;
    };

export const useWeekProgress = (): WeekProgress | null => {
  const now = useMinuteTick();
  const { entries, config, weekTotals } = useCore();

  const parsed = parseTimeLog(entries.text);
  if (Either.isLeft(parsed)) return null;

  const state = weekTotals.state;
  if (state.tag === "pending" || state.tag === "unavailable") return null;
  if (state.tag === "error") return { tag: "cannotFetch" };

  const billable = totalBillableMinutes(parsed.right, config.snapshot.submitter.findTargetId, now);
  return {
    tag: "loaded",
    billableMinutes: billable,
    loggedMinutes: state.loggedMinutes,
    requiredMinutes: state.requiredMinutes,
  };
};
