import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { EntriesService } from "./EntriesService";
import { type FakeFileService, makeFakeFileService } from "./fakeFileService";

const runWithFs = <A, E>(
  fs: FakeFileService,
  body: (svc: EntriesService) => Effect.Effect<A, E>,
): Promise<A> => {
  const layer = EntriesService.DefaultWithoutDependencies.pipe(Layer.provide(fs.layer));
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* EntriesService;
      return yield* body(svc);
    }).pipe(Effect.provide(layer), Effect.orDie),
  );
};

describe("EntriesService", () => {
  it("loads the time log text from disk on init", async () => {
    const fs = makeFakeFileService({ entries: "2026-01-01 10:00\nABC-1 hello\n" });
    const text = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(text).toBe("2026-01-01 10:00\nABC-1 hello\n");
  });

  it("defaults to an empty string when the disk has no entries file", async () => {
    const fs = makeFakeFileService();
    const text = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(text).toBe("");
  });

  it("setText updates the snapshot, writes to disk, and notifies subscribers", async () => {
    const fs = makeFakeFileService();
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => notifications.push(svc.snapshot()));
        yield* svc.setText("hello");
      }),
    );
    expect(notifications).toEqual(["hello"]);
    expect(fs.state.entries).toBe("hello");
  });

  it("setText with the current value does not notify subscribers", async () => {
    const fs = makeFakeFileService({ entries: "same" });
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => notifications.push(svc.snapshot()));
        yield* svc.setText("same");
      }),
    );
    expect(notifications).toEqual([]);
    expect(fs.state.entries).toBe("same");
  });

  it("unsubscribe stops further notifications", async () => {
    const fs = makeFakeFileService();
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        const unsubscribe = svc.subscribe(() => notifications.push(svc.snapshot()));
        yield* svc.setText("first");
        unsubscribe();
        yield* svc.setText("second");
      }),
    );
    expect(notifications).toEqual(["first"]);
    expect(fs.state.entries).toBe("second");
  });
});
