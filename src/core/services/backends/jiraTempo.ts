import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect, Either, Schema } from "effect";
import { SubmitError, TicketInfoError, WeekTotalsError } from "../../errors";
import type { BackendPlugin, BillableEntry, TicketInfo, WeekRange, WeekTotals } from "../Backend";
import { getSetting } from "../Backend";

const TICKET_ID_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;

const REQUIRED_FIELDS = [
  { key: "siteName", label: "Jira site name" },
  { key: "email", label: "Jira email" },
  { key: "workerId", label: "Jira Account ID" },
  { key: "jiraToken", label: "Jira API token" },
  { key: "tempoToken", label: "Tempo API token" },
] as const;

interface ResolvedSettings {
  readonly siteName: string;
  readonly email: string;
  readonly workerId: string;
  readonly jiraToken: string;
  readonly tempoToken: string;
}

export const jiraTempoPlugin: BackendPlugin = {
  id: "jiratempo",
  displayName: "JiraTempo",
  dev: false,
  settings: [
    {
      key: "siteName",
      label: "Jira site name",
      secret: false,
      description:
        "E.g. `ivanproduction` (if the Jira URL is `https://ivanproduction.atlassian.net`)",
    },
    {
      key: "email",
      label: "Jira email",
      secret: false,
      description: "E.g. `vasya@ivanproduction.com`",
    },
    {
      key: "workerId",
      label: "Jira Account ID",
      secret: false,
      description:
        "[How to find it](https://community.atlassian.com/t5/Jira-questions/how-to-find-accountid/qaq-p/1111436)",
    },
    {
      key: "jiraToken",
      label: "Jira API token",
      secret: true,
      description: "[Create it here](https://id.atlassian.com/manage-profile/security/api-tokens)",
    },
    {
      key: "tempoToken",
      label: "Tempo API token",
      secret: true,
      description: "[How to get it](https://apidocs.tempo.io/#section/Authentication)",
    },
  ],
  make: (settings) => ({
    id: "jiratempo",
    findTicketId: (text) => text.match(TICKET_ID_RE)?.[0] ?? null,
    submit: (entry) =>
      Effect.gen(function* () {
        const resolved = yield* resolveSettings(settings, (cause) => new SubmitError({ cause }));
        const http = yield* HttpClient.HttpClient;
        const issueId = yield* lookupIssueId(http, resolved, entry.ticketId);
        yield* postWorklog(http, resolved, entry, issueId);
      }),
    fetchTicketInfo: (ticketId) =>
      Effect.gen(function* () {
        const resolved = yield* resolveSettings(
          settings,
          (cause) => new TicketInfoError({ cause }),
        );
        const http = yield* HttpClient.HttpClient;
        const issue = yield* fetchJiraIssueDetails(http, resolved, ticketId);
        const info: TicketInfo = {
          title: issue.summary,
          url: `https://${resolved.siteName}.atlassian.net/browse/${ticketId}`,
          estimateMinutes: secondsToMinutes(issue.estimateSeconds),
          loggedMinutes: secondsToMinutes(issue.loggedSeconds) ?? 0,
        };
        return info;
      }),
    fetchWeekTotals: (range) =>
      Effect.gen(function* () {
        const resolved = resolveSettingsOrNull(settings);
        if (resolved === null) return null;
        const http = yield* HttpClient.HttpClient;
        const loggedSeconds = yield* fetchTempoLoggedSeconds(http, resolved, range);
        const totals: WeekTotals = {
          loggedMinutes: Math.floor(loggedSeconds / 60),
        };
        return totals;
      }),
  }),
};

const TempoWorklogsPageSchema = Schema.Struct({
  results: Schema.Array(Schema.Struct({ timeSpentSeconds: Schema.Number })),
  metadata: Schema.Struct({ next: Schema.optional(Schema.String) }),
});

const fetchTempoLoggedSeconds = (
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  range: WeekRange,
): Effect.Effect<number, WeekTotalsError> =>
  Effect.gen(function* () {
    let url: string | null =
      `https://api.tempo.io/4/worklogs/user/${s.workerId}` +
      `?from=${localDate(range.from)}&to=${localDate(range.to)}&limit=1000`;
    let total = 0;
    while (url !== null) {
      const page: Schema.Schema.Type<typeof TempoWorklogsPageSchema> = yield* fetchTempo(
        http,
        s,
        url,
        TempoWorklogsPageSchema,
        "Tempo worklogs",
      );
      for (const w of page.results) total += w.timeSpentSeconds;
      url = page.metadata.next ?? null;
    }
    return total;
  });

const fetchTempo = <A, I>(
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  url: string,
  schema: Schema.Schema<A, I>,
  label: string,
): Effect.Effect<A, WeekTotalsError> =>
  Effect.gen(function* () {
    const request = HttpClientRequest.get(url).pipe(
      HttpClientRequest.bearerToken(s.tempoToken),
      HttpClientRequest.acceptJson,
    );
    const response = yield* http
      .execute(request)
      .pipe(
        Effect.mapError((cause) => new WeekTotalsError({ cause: `${label}: ${stringify(cause)}` })),
      );
    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.text.pipe(Effect.orElseSucceed(() => ""));
      return yield* Effect.fail(
        new WeekTotalsError({
          cause: `${label} failed (${response.status}): ${body.slice(0, 200)}`,
        }),
      );
    }
    const json: unknown = yield* response.json.pipe(
      Effect.mapError((cause) => new WeekTotalsError({ cause: `${label}: ${stringify(cause)}` })),
    );
    const decoded = Schema.decodeUnknownEither(schema)(json);
    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new WeekTotalsError({ cause: `${label} response shape: ${String(decoded.left)}` }),
      );
    }
    return decoded.right;
  });

const missingSettingLabel = (settings: Readonly<Record<string, string>>): string | null => {
  for (const f of REQUIRED_FIELDS) {
    if (getSetting(settings, f.key).trim() === "") return f.label;
  }
  return null;
};

const buildResolvedSettings = (settings: Readonly<Record<string, string>>): ResolvedSettings => ({
  siteName: normalizeSiteName(getSetting(settings, "siteName")),
  email: getSetting(settings, "email").trim(),
  workerId: getSetting(settings, "workerId").trim(),
  jiraToken: getSetting(settings, "jiraToken"),
  tempoToken: getSetting(settings, "tempoToken"),
});

const resolveSettings = <E>(
  settings: Readonly<Record<string, string>>,
  toError: (cause: string) => E,
): Effect.Effect<ResolvedSettings, E> => {
  const missing = missingSettingLabel(settings);
  if (missing !== null) return Effect.fail(toError(`Missing setting: ${missing}`));
  return Effect.succeed(buildResolvedSettings(settings));
};

const resolveSettingsOrNull = (
  settings: Readonly<Record<string, string>>,
): ResolvedSettings | null =>
  missingSettingLabel(settings) === null ? buildResolvedSettings(settings) : null;

const lookupIssueId = (
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  ticketId: string,
): Effect.Effect<string, SubmitError> =>
  Effect.gen(function* () {
    const url = `https://${s.siteName}.atlassian.net/rest/api/3/issue/${ticketId}`;
    const request = HttpClientRequest.get(url).pipe(
      HttpClientRequest.basicAuth(s.email, s.jiraToken),
      HttpClientRequest.acceptJson,
    );
    const response = yield* http
      .execute(request)
      .pipe(
        Effect.mapError((cause) => new SubmitError({ cause: `Jira lookup: ${stringify(cause)}` })),
      );
    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.text.pipe(Effect.orElseSucceed(() => ""));
      return yield* Effect.fail(
        new SubmitError({
          cause: `Jira lookup failed for ${ticketId}: GET ${url} → ${response.status} — ${body.slice(0, 300)}`,
        }),
      );
    }
    const json: unknown = yield* response.json.pipe(
      Effect.mapError((cause) => new SubmitError({ cause: `Jira lookup: ${stringify(cause)}` })),
    );
    if (
      typeof json !== "object" ||
      json === null ||
      !("id" in json) ||
      typeof json.id !== "string"
    ) {
      return yield* Effect.fail(
        new SubmitError({ cause: `Jira lookup: 'id' missing or not a string in response` }),
      );
    }
    return json.id;
  });

const JiraIssueDetailsSchema = Schema.Struct({
  fields: Schema.Struct({
    summary: Schema.String,
    timeoriginalestimate: Schema.NullOr(Schema.Number),
    aggregatetimespent: Schema.NullOr(Schema.Number),
  }),
});

interface JiraIssueDetails {
  readonly summary: string;
  readonly estimateSeconds: number | null;
  readonly loggedSeconds: number | null;
}

const secondsToMinutes = (s: number | null): number | null =>
  s === null ? null : Math.floor(s / 60);

const fetchJiraIssueDetails = (
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  ticketId: string,
): Effect.Effect<JiraIssueDetails, TicketInfoError> =>
  Effect.gen(function* () {
    const url = `https://${s.siteName}.atlassian.net/rest/api/3/issue/${ticketId}?fields=summary,timeoriginalestimate,aggregatetimespent`;
    const request = HttpClientRequest.get(url).pipe(
      HttpClientRequest.basicAuth(s.email, s.jiraToken),
      HttpClientRequest.acceptJson,
    );
    const response = yield* http
      .execute(request)
      .pipe(
        Effect.mapError(
          (cause) => new TicketInfoError({ cause: `Jira fetch: ${stringify(cause)}` }),
        ),
      );
    if (response.status === 404) {
      return yield* Effect.fail(new TicketInfoError({ cause: `Not found in Jira: ${ticketId}` }));
    }
    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.text.pipe(Effect.orElseSucceed(() => ""));
      return yield* Effect.fail(
        new TicketInfoError({
          cause: `Jira fetch failed (${response.status}): ${body.slice(0, 200)}`,
        }),
      );
    }
    const json: unknown = yield* response.json.pipe(
      Effect.mapError((cause) => new TicketInfoError({ cause: `Jira fetch: ${stringify(cause)}` })),
    );
    const decoded = Schema.decodeUnknownEither(JiraIssueDetailsSchema)(json);
    if (Either.isLeft(decoded)) {
      return yield* Effect.fail(
        new TicketInfoError({ cause: `Jira response shape: ${String(decoded.left)}` }),
      );
    }
    const issue = decoded.right;
    return {
      summary: issue.fields.summary,
      estimateSeconds: issue.fields.timeoriginalestimate,
      loggedSeconds: issue.fields.aggregatetimespent,
    };
  });

const postWorklog = (
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  entry: BillableEntry,
  issueId: string,
): Effect.Effect<void, SubmitError> =>
  Effect.gen(function* () {
    const durationSeconds = Math.floor((entry.end.getTime() - entry.start.getTime()) / 1000);
    const body = {
      attributes: [],
      billableSeconds: durationSeconds,
      authorAccountId: s.workerId,
      description: entry.description,
      startDate: localDate(entry.start),
      startTime: localTime(entry.start),
      timeSpentSeconds: durationSeconds,
      issueId,
    };
    const url = "https://api.tempo.io/4/worklogs";
    const request = yield* HttpClientRequest.post(url).pipe(
      HttpClientRequest.bearerToken(s.tempoToken),
      HttpClientRequest.bodyJson(body),
      Effect.mapError((cause) => new SubmitError({ cause: `Tempo POST: ${stringify(cause)}` })),
    );
    const response = yield* http
      .execute(request)
      .pipe(
        Effect.mapError((cause) => new SubmitError({ cause: `Tempo POST: ${stringify(cause)}` })),
      );
    if (response.status < 200 || response.status >= 300) {
      const errBody = yield* response.text.pipe(Effect.orElseSucceed(() => ""));
      return yield* Effect.fail(
        new SubmitError({
          cause: `Tempo worklog POST failed for ${entry.ticketId}: POST ${url} → ${response.status} — ${errBody.slice(0, 300)}`,
        }),
      );
    }
  });

const normalizeSiteName = (raw: string): string =>
  raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.atlassian\.net$/i, "");

const pad2 = (n: number): string => n.toString().padStart(2, "0");

const localDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const localTime = (d: Date): string => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;

const stringify = (cause: unknown): string => {
  if (typeof cause === "string") return cause;
  if (cause === null || typeof cause !== "object") return String(cause);
  const parts: string[] = [];
  if ("_tag" in cause && typeof cause._tag === "string") parts.push(cause._tag);
  if ("reason" in cause && typeof cause.reason === "string") parts.push(cause.reason);
  if ("message" in cause && typeof cause.message === "string") parts.push(cause.message);
  if ("cause" in cause && cause.cause !== undefined && cause.cause !== null) {
    parts.push(`underlying: ${stringify(cause.cause)}`);
  }
  return parts.length > 0 ? parts.join(" — ") : String(cause);
};
