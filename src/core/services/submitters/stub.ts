import { Effect } from "effect";
import type { SubmitterPlugin } from "../Submitter";

export const stubPlugin: SubmitterPlugin = {
  id: "stub",
  displayName: "Stub (logs only)",
  settings: [],
  make: () =>
    Effect.succeed({
      id: "stub",
      submit: (entry) => Effect.log(`[stub] submit: ${entry.text}`),
    }),
};
