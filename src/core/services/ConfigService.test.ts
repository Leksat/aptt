import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../config";
import { ConfigService } from "./ConfigService";
import { type FakeFileService, makeFakeFileService } from "./fakeFileService";

const runWithFs = <A>(
  fs: FakeFileService,
  body: (svc: ConfigService) => Effect.Effect<A>,
): Promise<A> => {
  const layer = ConfigService.DefaultWithoutDependencies.pipe(Layer.provide(fs.layer));
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* ConfigService;
      return yield* body(svc);
    }).pipe(Effect.provide(layer)),
  );
};

describe("ConfigService", () => {
  it("uses defaults when the disk has no config", async () => {
    const fs = makeFakeFileService();
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config).toEqual(defaultConfig);
    expect(snap.submitter.id).toBe("void");
  });

  it("loads a valid config from disk", async () => {
    const fs = makeFakeFileService({
      config: JSON.stringify({
        activePluginId: "echo",
        pluginSettings: { echo: { prefix: "ABC", apiToken: "" } },
      }),
    });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config.activePluginId).toBe("echo");
    expect(snap.submitter.id).toBe("echo");
    expect(snap.submitter.parseTargetId("ABC-1")).toBe("ABC-1");
  });

  it("normalises an unknown active plugin id to the default plugin", async () => {
    const fs = makeFakeFileService({
      config: JSON.stringify({
        activePluginId: "bogus",
        pluginSettings: { bogus: { foo: "bar" } },
      }),
    });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config.activePluginId).toBe("void");
    expect(snap.submitter.id).toBe("void");
  });

  it("falls back to defaults when the config on disk is malformed", async () => {
    const fs = makeFakeFileService({ config: "{ not json" });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config).toEqual(defaultConfig);
  });

  it("setSetting writes to disk, rebuilds the submitter, and notifies subscribers", async () => {
    const fs = makeFakeFileService({
      config: JSON.stringify({
        activePluginId: "echo",
        pluginSettings: { echo: { prefix: "", apiToken: "" } },
      }),
    });
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() =>
          notifications.push(svc.snapshot().submitter.parseTargetId("ABC-1") ?? "miss"),
        );
        yield* svc.setSetting("echo", "prefix", "ABC");
      }),
    );
    expect(notifications).toEqual(["ABC-1"]);
    expect(JSON.parse(fs.state.config)).toEqual({
      activePluginId: "echo",
      pluginSettings: { echo: { prefix: "ABC", apiToken: "" } },
    });
  });

  it("setActivePluginId rebuilds the submitter and notifies", async () => {
    const fs = makeFakeFileService();
    const ids: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => ids.push(svc.snapshot().submitter.id));
        yield* svc.setActivePluginId("echo");
      }),
    );
    expect(ids).toEqual(["echo"]);
    expect(JSON.parse(fs.state.config).activePluginId).toBe("echo");
  });

  it("subscribe returns an unsubscribe that stops further notifications", async () => {
    const fs = makeFakeFileService();
    const calls: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        const unsubscribe = svc.subscribe(() => calls.push(svc.snapshot().config.activePluginId));
        yield* svc.setActivePluginId("echo");
        unsubscribe();
        yield* svc.setActivePluginId("void");
      }),
    );
    expect(calls).toEqual(["echo"]);
  });
});
