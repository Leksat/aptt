import { Effect } from "effect";
import type { SubmitterPlugin } from "../Submitter";

export const voidPlugin: SubmitterPlugin = {
  id: "void",
  displayName: "Void",
  settings: [],
  make: () =>
    Effect.succeed({
      id: "void",
      parseTargetId: () => null,
      submit: () => Effect.void,
    }),
};
