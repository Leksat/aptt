import type { Effect } from "effect";
import type { SubmitError } from "../errors";

export interface BillableEntry {
  readonly targetId: string;
  readonly start: Date;
  readonly end: Date;
  readonly comment: string;
}

export interface SubmitterImpl {
  readonly id: string;
  readonly parseTargetId: (text: string) => string | null;
  readonly submit: (entry: BillableEntry) => Effect.Effect<void, SubmitError>;
}

export interface SettingField {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
}

export interface SubmitterPlugin {
  readonly id: string;
  readonly displayName: string;
  readonly settings: ReadonlyArray<SettingField>;
  readonly make: (settings: Readonly<Record<string, string>>) => SubmitterImpl;
}

export const getSetting = (settings: Readonly<Record<string, string>>, key: string): string =>
  settings[key] ?? "";
