import { type Status, statusOf } from "../core/status";
import { useCore } from "./useCore";
import { useMinuteTick } from "./useMinuteTick";

export const useStatus = (): Status => {
  const now = useMinuteTick();
  const { entries, config, submit } = useCore();
  return statusOf(entries.text, config.snapshot.submitter.parseTargetId, submit.state, now);
};
