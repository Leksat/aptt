import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ClipboardTriggerService, type TriggerAction } from "./ClipboardTriggerService";

const run = <A, E>(body: (svc: ClipboardTriggerService) => Effect.Effect<A, E>): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* ClipboardTriggerService;
      return yield* body(svc);
    }).pipe(Effect.provide(ClipboardTriggerService.Default), Effect.orDie),
  );

describe("ClipboardTriggerService", () => {
  it("first press returns none", async () => {
    const action = await run((svc) => svc.process(0));
    expect(action).toBe<TriggerAction>("none");
  });

  it("second press within window returns capture", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        const a = yield* svc.process(0);
        const b = yield* svc.process(200);
        return [a, b];
      }),
    );
    expect(actions).toEqual<TriggerAction[]>(["none", "capture"]);
  });

  it("third press within window returns showWindow only after armSuccess", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        const a = yield* svc.process(0);
        const b = yield* svc.process(100);
        yield* svc.armSuccess;
        const c = yield* svc.process(200);
        return [a, b, c];
      }),
    );
    expect(actions).toEqual<TriggerAction[]>(["none", "capture", "showWindow"]);
  });

  it("third press without armSuccess returns none", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        const a = yield* svc.process(0);
        const b = yield* svc.process(100);
        const c = yield* svc.process(200);
        return [a, b, c];
      }),
    );
    expect(actions).toEqual<TriggerAction[]>(["none", "capture", "none"]);
  });

  it("second press outside window starts a fresh sequence", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        const a = yield* svc.process(0);
        const b = yield* svc.process(600);
        return [a, b];
      }),
    );
    expect(actions).toEqual<TriggerAction[]>(["none", "none"]);
  });

  it("third press outside window does not fire showWindow even when armed", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        const a = yield* svc.process(0);
        const b = yield* svc.process(100);
        yield* svc.armSuccess;
        const c = yield* svc.process(700);
        return [a, b, c];
      }),
    );
    expect(actions).toEqual<TriggerAction[]>(["none", "capture", "none"]);
  });

  it("after a completed 3-press sequence the next press starts fresh", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        yield* svc.process(0);
        yield* svc.process(100);
        yield* svc.armSuccess;
        yield* svc.process(200);
        const next = yield* svc.process(300);
        return next;
      }),
    );
    expect(actions).toBe<TriggerAction>("none");
  });

  it("reset clears state", async () => {
    const actions = await run((svc) =>
      Effect.gen(function* () {
        yield* svc.process(0);
        yield* svc.reset;
        const a = yield* svc.process(100);
        return a;
      }),
    );
    expect(actions).toBe<TriggerAction>("none");
  });
});
