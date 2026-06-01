import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitError } from "../errors";
import type { SubmitState } from "../submit";
import type { TimeLog } from "../timeLog";
import { SubmitService } from "./SubmitService";
import type { BillableEntry, SubmitterImpl } from "./Submitter";

const acceptABC = (token: string) => (/^ABC-\d+$/.test(token) ? token : null);

const fakeSubmitter = (
  decide: (entry: BillableEntry, attempt: number) => "ok" | string,
): SubmitterImpl => {
  let count = 0;
  return {
    id: "fake",
    parseTargetId: acceptABC,
    submit: (entry) =>
      Effect.suspend(() => {
        count += 1;
        const verdict = decide(entry, count);
        return verdict === "ok" ? Effect.void : Effect.fail(new SubmitError({ cause: verdict }));
      }),
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

const runWithService = <A>(body: (svc: SubmitService) => Effect.Effect<A>): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* SubmitService;
      return yield* body(svc);
    }).pipe(Effect.provide(SubmitService.Default)),
  );

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
