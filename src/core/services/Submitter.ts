import type { HttpClient } from "@effect/platform";
import type { Effect } from "effect";
import type { SubmitError, TargetInfoError } from "../errors";

export interface BillableEntry {
  readonly targetId: string;
  readonly start: Date;
  readonly end: Date;
  readonly description: string;
}

export interface TargetInfo {
  readonly title: string;
  readonly url: string;
  readonly estimateMinutes: number | null;
  readonly loggedMinutes: number;
}

export interface SubmitterImpl {
  readonly id: string;
  readonly findTargetId: (text: string) => string | null;
  readonly submit: (
    entry: BillableEntry,
  ) => Effect.Effect<void, SubmitError, HttpClient.HttpClient>;
  readonly fetchTargetInfo: (
    targetId: string,
  ) => Effect.Effect<TargetInfo | null, TargetInfoError, HttpClient.HttpClient>;
}

export interface SettingField {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
  readonly description?: string;
}

export interface SubmitterPlugin {
  readonly id: string;
  readonly displayName: string;
  readonly dev: boolean;
  readonly settings: ReadonlyArray<SettingField>;
  readonly make: (settings: Readonly<Record<string, string>>) => SubmitterImpl;
}

export const getSetting = (settings: Readonly<Record<string, string>>, key: string): string =>
  settings[key] ?? "";
