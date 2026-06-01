import { Duration, Effect } from "effect";
import { SubmitError } from "../../errors";
import type { SubmitterPlugin } from "../Submitter";

const JIRA_ISSUE_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;

export const voidPlugin: SubmitterPlugin = {
  id: "void",
  displayName: "Void",
  dev: true,
  settings: [],
  make: () => {
    let count = 0;
    return {
      id: "void",
      findTargetId: (text) => text.match(JIRA_ISSUE_KEY_RE)?.[0] ?? null,
      submit: () =>
        Effect.gen(function* () {
          count += 1;
          yield* Effect.sleep(Duration.millis(500));
          if (count === 3) {
            count = 0;
            return yield* Effect.fail(
              new SubmitError({
                cause: "Void submitter rejects every 3rd entry (for testing)",
              }),
            );
          }
        }),
    };
  },
};
