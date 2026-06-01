import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";
import { SubmitError } from "../../errors";
import type { BillableEntry, SubmitterPlugin } from "../Submitter";
import { getSetting } from "../Submitter";

const TARGET_ID_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;

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

export const jiraTempoPlugin: SubmitterPlugin = {
  id: "jiratempo",
  displayName: "JiraTempo",
  settings: [
    {
      key: "siteName",
      label: "Jira site name",
      secret: false,
      description:
        "E.g. `ivanproduction` (if the Jira URL is `https://ivanproduction.atlassian.net`).",
    },
    {
      key: "email",
      label: "Jira email",
      secret: false,
      description: "E.g. `vasya@ivanproduction.com`.",
    },
    {
      key: "workerId",
      label: "Jira Account ID",
      secret: false,
      description:
        "[How to find it](https://community.atlassian.com/t5/Jira-questions/how-to-find-accountid/qaq-p/1111436).",
    },
    {
      key: "jiraToken",
      label: "Jira API token",
      secret: true,
      description: "[Create it here](https://id.atlassian.com/manage-profile/security/api-tokens).",
    },
    {
      key: "tempoToken",
      label: "Tempo API token",
      secret: true,
      description: "[How to get it](https://apidocs.tempo.io/#section/Authentication).",
    },
  ],
  make: (settings) => ({
    id: "jiratempo",
    findTargetId: (text) => text.match(TARGET_ID_RE)?.[0] ?? null,
    submit: (entry) =>
      Effect.gen(function* () {
        const resolved = yield* resolveSettings(settings);
        const http = yield* HttpClient.HttpClient;
        const issueId = yield* lookupIssueId(http, resolved, entry.targetId);
        yield* postWorklog(http, resolved, entry, issueId);
      }),
  }),
};

const resolveSettings = (
  settings: Readonly<Record<string, string>>,
): Effect.Effect<ResolvedSettings, SubmitError> => {
  for (const f of REQUIRED_FIELDS) {
    if (getSetting(settings, f.key).trim() === "") {
      return Effect.fail(new SubmitError({ cause: `Missing setting: ${f.label}` }));
    }
  }
  return Effect.succeed({
    siteName: normalizeSiteName(getSetting(settings, "siteName")),
    email: getSetting(settings, "email").trim(),
    workerId: getSetting(settings, "workerId").trim(),
    jiraToken: getSetting(settings, "jiraToken"),
    tempoToken: getSetting(settings, "tempoToken"),
  });
};

const lookupIssueId = (
  http: HttpClient.HttpClient,
  s: ResolvedSettings,
  targetId: string,
): Effect.Effect<string, SubmitError> =>
  Effect.gen(function* () {
    const url = `https://${s.siteName}.atlassian.net/rest/api/3/issue/${targetId}`;
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
          cause: `Jira lookup failed for ${targetId}: GET ${url} → ${response.status} — ${body.slice(0, 300)}`,
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
      description: entry.comment,
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
          cause: `Tempo worklog POST failed for ${entry.targetId}: POST ${url} → ${response.status} — ${errBody.slice(0, 300)}`,
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
