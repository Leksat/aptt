import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { SubmitError, TicketInfoError, WeekTotalsError } from "../../errors";
import type { BillableEntry, WeekRange } from "../Backend";
import { jiraTempoPlugin } from "./jiraTempo";

interface CapturedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly body: string;
}

interface StubResponse {
  readonly status: number;
  readonly body: string;
}

const stubClient = (
  handle: (req: CapturedRequest) => StubResponse,
): { layer: Layer.Layer<HttpClient.HttpClient>; captured: CapturedRequest[] } => {
  const captured: CapturedRequest[] = [];
  const client = HttpClient.make((request) =>
    Effect.sync(() => {
      const body = request.body;
      let text = "";
      if (body._tag === "Uint8Array") text = new TextDecoder().decode(body.body);
      else if (body._tag === "Raw" && typeof body.body === "string") text = body.body;
      const cap: CapturedRequest = {
        method: request.method,
        url: request.url,
        headers: new Map(Object.entries({ ...request.headers })),
        body: text,
      };
      captured.push(cap);
      const { status, body: respBody } = handle(cap);
      return HttpClientResponse.fromWeb(
        request,
        new Response(respBody, {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    }),
  );
  return { layer: Layer.succeed(HttpClient.HttpClient, client), captured };
};

const completeSettings: Readonly<Record<string, string>> = {
  siteName: "acme",
  email: "vasya@acme.com",
  workerId: "user-123",
  jiraToken: "jira-secret",
  tempoToken: "tempo-secret",
};

const sampleEntry: BillableEntry = {
  ticketId: "ABC-123",
  start: new Date("2026-01-01T10:00:00"),
  end: new Date("2026-01-01T11:30:00"),
  description: "fix login",
};

const runSubmit = (
  settings: Readonly<Record<string, string>>,
  entry: BillableEntry,
  layer: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    Effect.either(jiraTempoPlugin.make(settings).submit(entry)).pipe(Effect.provide(layer)),
  );

describe("jiraTempoPlugin.findTicketId", () => {
  const find = jiraTempoPlugin.make({}).findTicketId;

  it("returns the key when the input is exactly a Jira key", () => {
    expect(find("ABC-123")).toBe("ABC-123");
    expect(find("AB-1")).toBe("AB-1");
    expect(find("PROJ7-99")).toBe("PROJ7-99");
  });

  it("extracts the first key from arbitrary surrounding text", () => {
    expect(find("foo ABC-123 bar")).toBe("ABC-123");
    expect(find("http://foo.bar/ABC-123")).toBe("ABC-123");
    expect(find("[ABC-123] Fix login\nDEF-7 also")).toBe("ABC-123");
  });

  it("returns null when no key is present", () => {
    expect(find("abc-1")).toBeNull();
    expect(find("A-1")).toBeNull();
    expect(find("ABC-")).toBeNull();
    expect(find("ABC-0a")).toBeNull();
    expect(find("123-456")).toBeNull();
    expect(find("")).toBeNull();
  });

  it("does not depend on settings", () => {
    expect(jiraTempoPlugin.make({}).findTicketId("ABC-1")).toBe("ABC-1");
  });
});

describe("jiraTempoPlugin.submit", () => {
  it("looks up the issue then posts a worklog", async () => {
    const { layer, captured } = stubClient((req) => {
      if (req.url.startsWith("https://acme.atlassian.net"))
        return { status: 200, body: JSON.stringify({ id: "10042", key: "ABC-123" }) };
      return { status: 200, body: "{}" };
    });

    const result = await runSubmit(completeSettings, sampleEntry, layer);

    expect(Either.isRight(result)).toBe(true);
    expect(captured).toHaveLength(2);

    const jira = captured[0];
    if (jira === undefined) throw new Error("missing jira request");
    expect(jira.method).toBe("GET");
    expect(jira.url).toBe("https://acme.atlassian.net/rest/api/3/issue/ABC-123");
    expect(jira.headers.get("authorization")).toBe(`Basic ${btoa("vasya@acme.com:jira-secret")}`);
    expect(jira.headers.get("accept")).toBe("application/json");

    const tempo = captured[1];
    if (tempo === undefined) throw new Error("missing tempo request");
    expect(tempo.method).toBe("POST");
    expect(tempo.url).toBe("https://api.tempo.io/4/worklogs");
    expect(tempo.headers.get("authorization")).toBe("Bearer tempo-secret");
    expect(JSON.parse(tempo.body)).toEqual({
      attributes: [],
      billableSeconds: 5400,
      authorAccountId: "user-123",
      description: "fix login",
      startDate: "2026-01-01",
      startTime: "10:00:00",
      timeSpentSeconds: 5400,
      issueId: "10042",
    });
  });

  it("fails fast with a labelled error when a required setting is missing", async () => {
    const { layer, captured } = stubClient(() => ({ status: 200, body: "{}" }));
    const result = await runSubmit({ ...completeSettings, tempoToken: "" }, sampleEntry, layer);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SubmitError);
      expect(String(result.left.cause)).toBe("Missing setting: Tempo API token");
    }
    expect(captured).toEqual([]);
  });

  it("reports a Jira lookup failure on 404", async () => {
    const { layer, captured } = stubClient(() => ({
      status: 404,
      body: "Issue Does Not Exist",
    }));
    const result = await runSubmit(completeSettings, sampleEntry, layer);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(String(result.left.cause)).toBe(
        "Jira lookup failed for ABC-123: GET https://acme.atlassian.net/rest/api/3/issue/ABC-123 → 404 — Issue Does Not Exist",
      );
    }
    expect(captured).toHaveLength(1);
  });

  it("reports a Tempo POST failure on 401", async () => {
    const { layer, captured } = stubClient((req) => {
      if (req.url.startsWith("https://acme.atlassian.net"))
        return { status: 200, body: JSON.stringify({ id: "10042" }) };
      return { status: 401, body: "Unauthorized" };
    });
    const result = await runSubmit(completeSettings, sampleEntry, layer);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(String(result.left.cause)).toBe(
        "Tempo worklog POST failed for ABC-123: POST https://api.tempo.io/4/worklogs → 401 — Unauthorized",
      );
    }
    expect(captured).toHaveLength(2);
  });

  it("normalises siteName variants to the same Jira URL", async () => {
    const variants = ["acme", "https://acme.atlassian.net", "acme.atlassian.net"];
    const urls: string[] = [];
    for (const siteName of variants) {
      const { layer } = stubClient((req) => {
        urls.push(req.url);
        if (req.method === "GET") return { status: 200, body: JSON.stringify({ id: "1" }) };
        return { status: 200, body: "{}" };
      });
      await runSubmit({ ...completeSettings, siteName }, sampleEntry, layer);
    }
    const jiraUrls = urls.filter((u) => u.includes("atlassian.net"));
    expect(jiraUrls).toEqual([
      "https://acme.atlassian.net/rest/api/3/issue/ABC-123",
      "https://acme.atlassian.net/rest/api/3/issue/ABC-123",
      "https://acme.atlassian.net/rest/api/3/issue/ABC-123",
    ]);
  });

  it("sends only the description (without the ticket id) as Tempo's description", async () => {
    const { layer, captured } = stubClient((req) => {
      if (req.method === "GET") return { status: 200, body: JSON.stringify({ id: "1" }) };
      return { status: 200, body: "{}" };
    });
    await runSubmit(completeSettings, { ...sampleEntry, description: "fix login" }, layer);
    const tempo = captured[1];
    if (tempo === undefined) throw new Error("missing tempo request");
    expect(JSON.parse(tempo.body).description).toBe("fix login");
  });
});

const runFetchTicketInfo = (
  settings: Readonly<Record<string, string>>,
  ticketId: string,
  layer: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    Effect.either(jiraTempoPlugin.make(settings).fetchTicketInfo(ticketId)).pipe(
      Effect.provide(layer),
    ),
  );

const jiraIssueResponse = (over: {
  summary?: string;
  timeoriginalestimate?: number | null;
  aggregatetimespent?: number | null;
}): string =>
  JSON.stringify({
    fields: {
      summary: over.summary ?? "Title goes here",
      timeoriginalestimate:
        over.timeoriginalestimate === undefined ? 18000 : over.timeoriginalestimate,
      aggregatetimespent: over.aggregatetimespent === undefined ? 1800 : over.aggregatetimespent,
    },
  });

describe("jiraTempoPlugin.fetchTicketInfo", () => {
  it("returns title, url, estimate, and logged (all workers) from one Jira request", async () => {
    const { layer, captured } = stubClient(() => ({
      status: 200,
      body: jiraIssueResponse({
        summary: "Fix login",
        timeoriginalestimate: 18000,
        aggregatetimespent: 1800,
      }),
    }));

    const result = await runFetchTicketInfo(completeSettings, "ABC-123", layer);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        title: "Fix login",
        url: "https://acme.atlassian.net/browse/ABC-123",
        estimateMinutes: 300,
        loggedMinutes: 30,
      });
    }

    expect(captured).toHaveLength(1);
    const jira = captured[0];
    if (jira === undefined) throw new Error("missing jira request");
    expect(jira.url).toBe(
      "https://acme.atlassian.net/rest/api/3/issue/ABC-123?fields=summary,timeoriginalestimate,aggregatetimespent",
    );
    expect(jira.headers.get("authorization")).toBe(`Basic ${btoa("vasya@acme.com:jira-secret")}`);
  });

  it("returns null estimate when Jira reports it as null", async () => {
    const { layer } = stubClient(() => ({
      status: 200,
      body: jiraIssueResponse({
        timeoriginalestimate: null,
        aggregatetimespent: 0,
      }),
    }));

    const result = await runFetchTicketInfo(completeSettings, "ABC-123", layer);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right?.estimateMinutes).toBeNull();
      expect(result.right?.loggedMinutes).toBe(0);
    }
  });

  it("treats null aggregatetimespent as 0 logged minutes", async () => {
    const { layer } = stubClient(() => ({
      status: 200,
      body: jiraIssueResponse({ aggregatetimespent: null }),
    }));

    const result = await runFetchTicketInfo(completeSettings, "ABC-123", layer);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right?.loggedMinutes).toBe(0);
    }
  });

  it("fails with a TicketInfoError on Jira 404", async () => {
    const { layer } = stubClient(() => ({ status: 404, body: "Issue Does Not Exist" }));
    const result = await runFetchTicketInfo(completeSettings, "ABC-999", layer);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(TicketInfoError);
      expect(String(result.left.cause)).toBe("Not found in Jira: ABC-999");
    }
  });

  it("fails with a TicketInfoError when Jira auth is rejected", async () => {
    const { layer } = stubClient(() => ({ status: 401, body: "Unauthorized" }));
    const result = await runFetchTicketInfo(completeSettings, "ABC-123", layer);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(TicketInfoError);
      expect(String(result.left.cause)).toBe("Jira fetch failed (401): Unauthorized");
    }
  });

  it("fails with a TicketInfoError when a required setting is missing", async () => {
    const { layer, captured } = stubClient(() => ({ status: 200, body: "{}" }));
    const result = await runFetchTicketInfo(
      { ...completeSettings, tempoToken: "" },
      "ABC-123",
      layer,
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(TicketInfoError);
      expect(String(result.left.cause)).toBe("Missing setting: Tempo API token");
    }
    expect(captured).toEqual([]);
  });
});

const sampleRange: WeekRange = {
  from: new Date("2026-06-29T00:00:00"),
  to: new Date("2026-07-05T00:00:00"),
};

const runFetchWeekTotals = (
  settings: Readonly<Record<string, string>>,
  range: WeekRange,
  layer: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    Effect.either(jiraTempoPlugin.make(settings).fetchWeekTotals(range)).pipe(
      Effect.provide(layer),
    ),
  );

const worklogsPage = (seconds: number[], next?: string): string =>
  JSON.stringify({
    results: seconds.map((s) => ({ timeSpentSeconds: s })),
    metadata: next === undefined ? {} : { next },
  });

describe("jiraTempoPlugin.fetchWeekTotals", () => {
  it("sums Tempo worklogs into minutes", async () => {
    const { layer, captured } = stubClient(() => ({
      status: 200,
      body: worklogsPage([3600, 1800]),
    }));

    const result = await runFetchWeekTotals(completeSettings, sampleRange, layer);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({ loggedMinutes: 90 });
    }

    const worklogs = captured.find((c) => c.url.includes("/worklogs/"));
    if (worklogs === undefined) throw new Error("missing worklogs request");
    expect(worklogs.url).toBe(
      "https://api.tempo.io/4/worklogs/user/user-123?from=2026-06-29&to=2026-07-05&limit=1000",
    );
    expect(worklogs.headers.get("authorization")).toBe("Bearer tempo-secret");
  });

  it("follows worklog pagination via metadata.next", async () => {
    let worklogCall = 0;
    const { layer } = stubClient(() => {
      worklogCall += 1;
      return worklogCall === 1
        ? {
            status: 200,
            body: worklogsPage(
              [3600],
              "https://api.tempo.io/4/worklogs/user/user-123?offset=1000&limit=1000",
            ),
          }
        : { status: 200, body: worklogsPage([1800]) };
    });

    const result = await runFetchWeekTotals(completeSettings, sampleRange, layer);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({ loggedMinutes: 90 });
    }
    expect(worklogCall).toBe(2);
  });

  it("fails with a WeekTotalsError when Tempo rejects the worklogs request", async () => {
    const { layer } = stubClient(() => ({ status: 401, body: "Unauthorized" }));
    const result = await runFetchWeekTotals(completeSettings, sampleRange, layer);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(WeekTotalsError);
      expect(String(result.left.cause)).toBe("Tempo worklogs failed (401): Unauthorized");
    }
  });

  it("returns null (hidden) when Tempo is not configured", async () => {
    const { layer, captured } = stubClient(() => ({ status: 200, body: "{}" }));
    const result = await runFetchWeekTotals(
      { ...completeSettings, tempoToken: "" },
      sampleRange,
      layer,
    );
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toBeNull();
    }
    expect(captured).toEqual([]);
  });
});
