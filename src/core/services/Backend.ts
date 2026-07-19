import type { HttpClient } from "@effect/platform";
import type { Effect } from "effect";
import type { SubmitError, TicketInfoError, WeekTotalsError } from "../errors";

export interface BillableEntry {
  readonly ticketId: string;
  readonly start: Date;
  readonly end: Date;
  readonly description: string;
}

export interface TicketInfo {
  readonly title: string;
  readonly url: string;
  readonly estimateMinutes: number | null;
  readonly loggedMinutes: number;
}

export interface WeekRange {
  readonly from: Date;
  readonly to: Date;
}

export interface WeekTotals {
  readonly loggedMinutes: number;
}

export interface Backend {
  readonly id: string;
  readonly findTicketId: (text: string) => string | null;
  readonly submit: (
    entry: BillableEntry,
  ) => Effect.Effect<void, SubmitError, HttpClient.HttpClient>;
  readonly fetchTicketInfo: (
    ticketId: string,
  ) => Effect.Effect<TicketInfo | null, TicketInfoError, HttpClient.HttpClient>;
  readonly fetchWeekTotals: (
    range: WeekRange,
  ) => Effect.Effect<WeekTotals | null, WeekTotalsError, HttpClient.HttpClient>;
}

export interface SettingField {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
  readonly description?: string;
}

export interface BackendPlugin {
  readonly id: string;
  readonly displayName: string;
  readonly dev: boolean;
  readonly settings: ReadonlyArray<SettingField>;
  readonly make: (settings: Readonly<Record<string, string>>) => Backend;
}

export const getSetting = (settings: Readonly<Record<string, string>>, key: string): string =>
  settings[key] ?? "";
