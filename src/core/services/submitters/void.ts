import { Duration, Effect } from "effect";
import type { SubmitterPlugin } from "../Submitter";

const JIRA_ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export const voidPlugin: SubmitterPlugin = {
  id: "void",
  displayName: "Void",
  settings: [],
  make: () =>
    Effect.succeed({
      id: "void",
      parseTargetId: (text) => (JIRA_ISSUE_KEY_RE.test(text) ? text : null),
      submit: () => Effect.sleep(Duration.millis(500)),
    }),
};
