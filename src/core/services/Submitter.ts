import { Context, type Effect } from "effect";
import type { SubmitError, SubmitterInitError } from "../errors";
import type { TimeEntry } from "../types";

export interface SubmitterImpl {
  readonly id: string;
  readonly submit: (entry: TimeEntry) => Effect.Effect<void, SubmitError>;
}

export class Submitter extends Context.Tag("Submitter")<Submitter, SubmitterImpl>() {}

export interface SettingField {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
}

export interface SubmitterPlugin {
  readonly id: string;
  readonly displayName: string;
  readonly settings: ReadonlyArray<SettingField>;
  readonly make: (
    settings: Readonly<Record<string, string>>,
  ) => Effect.Effect<SubmitterImpl, SubmitterInitError>;
}
