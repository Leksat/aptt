import { FetchHttpClient, type HttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitError } from "../errors";
import type { SubmitState } from "../submit";
import type { TimeLog } from "../timeLog";
import { type FakeFileService, makeFakeFileService } from "./fakeFileService";
import { SubmitService } from "./SubmitService";
import type { BillableEntry, SubmitterImpl } from "./Submitter";

const acceptABC = (token: string) => (/^ABC-\d+$/.test(token) ? token : null);

const fakeSubmitter = (
  decide: (entry: BillableEntry, attempt: number) => "ok" | string,
): SubmitterImpl => {
  let count = 0;
  return {
    id: "fake",
    findTicketId: acceptABC,
    submit: (entry) =>
      Effect.suspend(() => {
        count += 1;
        const verdict = decide(entry, count);
        return verdict === "ok" ? Effect.void : Effect.fail(new SubmitError({ cause: verdict }));
      }),
    fetchTicketInfo: () => Effect.succeed(null),
    fetchWeekTotals: () => Effect.succeed(null),
  };
};

const sampleLog: TimeLog = {
  closed: [
    {
      start: new Date("2026-01-01T10:00"),
      end: new Date("2026-01-01T11:00"),
      description: "ABC-1 a",
    },
    {
      start: new Date("2026-01-01T11:00"),
      end: new Date("2026-01-01T12:00"),
      description: "ABC-2 b",
    },
  ],
  active: null,
};

const runWithService = <A>(
  body: (svc: SubmitService, fs: FakeFileService) => Effect.Effect<A, never, HttpClient.HttpClient>,
): Promise<A> => {
  const fs = makeFakeFileService();
  const layer = Layer.mergeAll(
    SubmitService.DefaultWithoutDependencies.pipe(Layer.provide(fs.layer)),
    FetchHttpClient.layer,
  );
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* SubmitService;
      return yield* body(svc, fs);
    }).pipe(Effect.provide(layer)),
  );
};

const formatTransition = (s: SubmitState): string => {
  switch (s.tag) {
    case "idle":
      return "idle";
    case "submitting":
      return `submitting ${s.current}/${s.total}`;
    case "success":
      return `success ${s.total}`;
  }
};

describe("SubmitService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in the idle state", async () => {
    await runWithService((svc) =>
      Effect.sync(() => {
        expect(svc.snapshot()).toEqual({ tag: "idle" });
      }),
    );
  });

  it("transitions idle → submitting (with progress) → success → idle after the linger window", async () => {
    const transitions: string[] = [];
    await runWithService((svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => transitions.push(formatTransition(svc.snapshot())));
        yield* svc.submit(
          sampleLog,
          fakeSubmitter(() => "ok"),
        );
        expect(svc.snapshot()).toEqual({ tag: "success", total: 2 });
        vi.advanceTimersByTime(3000);
        expect(svc.snapshot()).toEqual({ tag: "idle" });
      }),
    );
    expect(transitions).toEqual([
      "submitting 0/0",
      "submitting 1/2",
      "submitting 2/2",
      "success 2",
      "idle",
    ]);
  });

  it("ends in idle immediately when a submit fails (no success linger)", async () => {
    await runWithService((svc) =>
      Effect.gen(function* () {
        const result = yield* svc.submit(
          sampleLog,
          fakeSubmitter((_, n) => (n === 2 ? "boom" : "ok")),
        );
        expect(result.tag).toBe("error");
        expect(svc.snapshot()).toEqual({ tag: "idle" });
      }),
    );
  });

  it("writes a history file on successful submit", async () => {
    await runWithService((svc, fs) =>
      Effect.gen(function* () {
        yield* svc.submit(
          sampleLog,
          fakeSubmitter(() => "ok"),
        );
        const filenames = Object.keys(fs.state.history);
        expect(filenames).toHaveLength(1);
        expect(filenames[0]).toMatch(/^\d{8}-\d{6}[+-]\d{4}\.txt$/);
        expect(fs.state.history[filenames[0] ?? ""]).toContain("ABC-1 a");
        expect(fs.state.history[filenames[0] ?? ""]).toContain("ABC-2 b");
      }),
    );
  });

  it("writes a history file when only non-billable entries are removed", async () => {
    const nothingLog: TimeLog = {
      closed: [
        {
          start: new Date("2026-01-01T10:00"),
          end: new Date("2026-01-01T11:00"),
          description: "nothing",
        },
      ],
      active: { start: new Date("2026-01-01T11:00"), description: "" },
    };
    await runWithService((svc, fs) =>
      Effect.gen(function* () {
        yield* svc.submit(
          nothingLog,
          fakeSubmitter(() => "ok"),
        );
        const filenames = Object.keys(fs.state.history);
        expect(filenames).toHaveLength(1);
        expect(fs.state.history[filenames[0] ?? ""]).toContain("nothing");
      }),
    );
  });

  it("does not write a history file when nothing was removed from the live log", async () => {
    const failedFirstLog: TimeLog = {
      closed: [
        {
          start: new Date("2026-01-01T10:00"),
          end: new Date("2026-01-01T11:00"),
          description: "ABC-1 a",
        },
      ],
      active: { start: new Date("2026-01-01T11:00"), description: "" },
    };
    await runWithService((svc, fs) =>
      Effect.gen(function* () {
        yield* svc.submit(
          failedFirstLog,
          fakeSubmitter(() => "boom"),
        );
        expect(Object.keys(fs.state.history)).toHaveLength(0);
      }),
    );
  });

  it("openHistoryDir delegates to FileService", async () => {
    await runWithService((svc, fs) =>
      Effect.gen(function* () {
        yield* svc.openHistoryDir;
        expect(fs.state.historyOpened).toBe(1);
      }),
    );
  });

  it("a new submit during the linger window cancels the prior linger timer", async () => {
    await runWithService((svc) =>
      Effect.gen(function* () {
        yield* svc.submit(
          sampleLog,
          fakeSubmitter(() => "ok"),
        );
        expect(svc.snapshot().tag).toBe("success");

        vi.advanceTimersByTime(2000);
        expect(svc.snapshot().tag).toBe("success");

        yield* svc.submit(
          sampleLog,
          fakeSubmitter(() => "ok"),
        );
        expect(svc.snapshot().tag).toBe("success");

        vi.advanceTimersByTime(1500);
        expect(svc.snapshot().tag).toBe("success");

        vi.advanceTimersByTime(1500);
        expect(svc.snapshot().tag).toBe("idle");
      }),
    );
  });
});
