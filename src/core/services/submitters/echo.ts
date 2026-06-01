import { Effect } from "effect";
import { getSetting, type SubmitterPlugin } from "../Submitter";

export const echoPlugin: SubmitterPlugin = {
  id: "echo",
  displayName: "Echo",
  settings: [
    { key: "prefix", label: "Accepted prefix", secret: false },
    { key: "apiToken", label: "API token", secret: true },
  ],
  make: (settings) => {
    const prefix = getSetting(settings, "prefix");
    return {
      id: "echo",
      parseTargetId: (text) => (prefix !== "" && text.startsWith(prefix) ? text : null),
      submit: () => Effect.void,
    };
  },
};
