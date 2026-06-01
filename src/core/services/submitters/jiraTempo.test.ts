import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { SubmitError } from "../../errors";
import type { BillableEntry } from "../Submitter";
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
  targetId: "ABC-123",
  start: new Date("2026-01-01T10:00:00"),
  end: new Date("2026-01-01T11:30:00"),
  comment: "fix login",
};

const runSubmit = (
  settings: Readonly<Record<string, string>>,
  entry: BillableEntry,
  layer: Layer.Layer<HttpClient.HttpClient>,
) =>
  Effect.runPromise(
    Effect.either(jiraTempoPlugin.make(settings).submit(entry)).pipe(Effect.provide(layer)),
  );

describe("jiraTempoPlugin.findTargetId", () => {
  const find = jiraTempoPlugin.make({}).findTargetId;

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
    expect(jiraTempoPlugin.make({}).findTargetId("ABC-1")).toBe("ABC-1");
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

  it("sends only the comment (without the target id) as the description", async () => {
    const { layer, captured } = stubClient((req) => {
      if (req.method === "GET") return { status: 200, body: JSON.stringify({ id: "1" }) };
      return { status: 200, body: "{}" };
    });
    await runSubmit(completeSettings, { ...sampleEntry, comment: "fix login" }, layer);
    const tempo = captured[1];
    if (tempo === undefined) throw new Error("missing tempo request");
    expect(JSON.parse(tempo.body).description).toBe("fix login");
  });
});
