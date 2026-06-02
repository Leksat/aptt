import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { type FakeFileService, makeFakeFileService } from "./fakeFileService";
import { NotesService } from "./NotesService";

const runWithFs = <A, E>(
  fs: FakeFileService,
  body: (svc: NotesService) => Effect.Effect<A, E>,
): Promise<A> => {
  const layer = NotesService.DefaultWithoutDependencies.pipe(Layer.provide(fs.layer));
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* NotesService;
      return yield* body(svc);
    }).pipe(Effect.provide(layer), Effect.orDie),
  );
};

describe("NotesService", () => {
  it("loads the notes text from disk on init", async () => {
    const fs = makeFakeFileService({ notes: "buy milk\ncall mom\n" });
    const text = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(text).toBe("buy milk\ncall mom\n");
  });

  it("defaults to an empty string when the disk has no notes file", async () => {
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
    expect(fs.state.notes).toBe("hello");
  });

  it("setText with the current value does not notify subscribers", async () => {
    const fs = makeFakeFileService({ notes: "same" });
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => notifications.push(svc.snapshot()));
        yield* svc.setText("same");
      }),
    );
    expect(notifications).toEqual([]);
    expect(fs.state.notes).toBe("same");
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
    expect(fs.state.notes).toBe("second");
  });
});
