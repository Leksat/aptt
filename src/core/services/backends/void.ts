import { Duration, Effect } from "effect";
import { SubmitError } from "../../errors";
import type { BackendPlugin } from "../Backend";

const JIRA_ISSUE_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;

export const voidPlugin: BackendPlugin = {
  id: "void",
  displayName: "Void",
  dev: true,
  settings: [],
  make: () => {
    let count = 0;
    return {
      id: "void",
      findTicketId: (text) => text.match(JIRA_ISSUE_KEY_RE)?.[0] ?? null,
      ticketUrl: () => null,
      submit: () =>
        Effect.gen(function* () {
          count += 1;
          yield* Effect.sleep(Duration.millis(500));
          if (count === 3) {
            count = 0;
            return yield* Effect.fail(
              new SubmitError({
                cause: "Void backend rejects every 3rd entry (for testing)",
              }),
            );
          }
        }),
      fetchTicketInfo: () => Effect.succeed(null),
      fetchWeekTotals: () => Effect.succeed(null),
    };
  },
};
