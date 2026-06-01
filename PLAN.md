# PLAN

Working spec for what aptt should do. Each section is a concrete behavioural target. Delete sections as they are implemented.

## JiraTempo submitter

A new submitter plugin that submits closed billable entries to Tempo (with one Jira lookup per entry to resolve the issue key into Tempo's integer `issueId`). Lives at `src/core/services/submitters/jiraTempo.ts` and is registered in `registry.ts`.

### Plugin identity

- `id`: `jiratempo`
- `displayName`: `JiraTempo`

### Target ID

- Regex: `/^[A-Z][A-Z0-9]+-\d+$/` (Atlassian project key: starts with a letter, 2+ chars, uppercase; followed by `-` and a positive integer).
- Tested against the first whitespace-delimited token of the time entry description (already done by `billableEntryOf` in `src/core/submit.ts`).
- `parseTargetId` does not depend on settings — works even when the plugin is unconfigured.

### Settings (mirror dev branch wording)

| key          | label              | secret | description (plain text + `[text](url)` links)                                                                |
| ------------ | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| `siteName`   | Jira site name     | false  | E.g. `ivanproduction` (if the Jira URL is `https://ivanproduction.atlassian.net`).                            |
| `email`      | Jira email         | false  | E.g. `vasya@ivanproduction.com`.                                                                              |
| `workerId`   | Jira Account ID    | false  | [How to find it](https://community.atlassian.com/t5/Jira-questions/how-to-find-accountid/qaq-p/1111436).      |
| `jiraToken`  | Jira API token     | true   | [Create it here](https://id.atlassian.com/manage-profile/security/api-tokens).                                |
| `tempoToken` | Tempo API token    | true   | [How to get it](https://apidocs.tempo.io/#section/Authentication).                                            |

`SettingField` is extended with an optional `description: string` (plain text where `[text](url)` becomes an anchor; no other markdown). Settings pane renders it under each input.

`siteName` accepts either bare (`foo`) or URL form (`https://foo.atlassian.net`) — both normalise to `foo` before building URLs.

### Submit flow (per billable entry)

1. `GET https://{siteName}.atlassian.net/rest/api/3/issue/{targetId}` with `Authorization: Basic base64(email + ":" + jiraToken)` and `Accept: application/json`. Read `id` from the JSON response — that's the integer `issueId`.
2. `POST https://api.tempo.io/4/worklogs` with `Authorization: Bearer {tempoToken}` and JSON body:
   ```json
   {
     "attributes": [],
     "billableSeconds": <durationSeconds>,
     "authorAccountId": "<workerId>",
     "description": "<entry.comment>",
     "startDate": "YYYY-MM-DD",
     "startTime": "HH:MM:00",
     "timeSpentSeconds": <durationSeconds>,
     "issueId": "<issueId>"
   }
   ```

Notes:
- `entry.comment` is already the description with the leading target ID and surrounding whitespace stripped (handled by `billableEntryOf`).
- `billableSeconds === timeSpentSeconds === floor((end - start) / 1000)`.
- `startDate` / `startTime` are derived from `entry.start` in local time (matches how the time log is authored and how Tempo interprets unzoned values).
- `attributes` is always `[]`. Per-account custom attributes are out of scope.
- No issueId caching — one Jira call + one Tempo call per submit. Repeat lookups for the same key in one batch are accepted as a cost.

### HTTP seam

- Use `@effect/platform`'s `HttpClient` (already a dep) directly. No custom port.
- Plugin's `submit` returns `Effect<void, SubmitError, HttpClient.HttpClient>`. This means `SubmitterImpl.submit` gains a requirement parameter; `Submitter.ts` is updated so the requirement is propagated through `SubmitService.submit` and provided by the runtime.
- Production layer wires the platform's fetch-based HttpClient.
- Tests provide an in-memory HttpClient layer that asserts on request URL/headers/body and returns canned responses.

### Failure mode

Already defined by `submitTimeLog` in `src/core/submit.ts`: on the first failure, prior successful entries are dropped from the log, the failed entry plus everything after it remains, and the error is surfaced via the existing error popup. JiraTempo only needs to produce a `SubmitError` with a useful `cause`.

### Error messages (`SubmitError.cause`)

- Missing setting: `Missing setting: <label>` (checked at the start of `submit`, before any HTTP call). Required for submit: all five settings non-empty.
- Jira lookup failure: `Jira lookup failed for <targetId>: <status> — <body[:300]>`.
- Tempo POST failure: `Tempo worklog POST failed for <targetId>: <status> — <body[:300]>`.
- Network / parse errors: wrap the underlying error as `cause` with a phase prefix (`Jira lookup`, `Tempo POST`).

### Tests

- `jiraTempo.test.ts`: drives the plugin through a stub `HttpClient` layer. Cases:
  - `parseTargetId` regex (positive + negative cases).
  - Happy path: GET issue → POST worklog → success. Assert exact URLs, headers, body shape.
  - Missing setting fails fast with the right message; no HTTP call made.
  - Jira 404 → SubmitError with `Jira lookup failed`.
  - Tempo 401 → SubmitError with `Tempo worklog POST failed`.
  - `siteName` normalisation: `foo`, `https://foo.atlassian.net`, `foo.atlassian.net` all build the same Jira URL.
  - Description stripping: entry with `ABC-123 fix login` → POST body description is `fix login`.

## Right-panel tabs

Needs grilling.

## "New from selected" button

Needs grilling.

## Style UI

Needs grilling.

## Hide dev-only submitters in production

Needs grilling.
