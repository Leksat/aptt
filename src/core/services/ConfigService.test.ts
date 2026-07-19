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
    expect(snap.backend.id).toBe("jiratempo");
  });

  it("loads a valid config from disk", async () => {
    const fs = makeFakeFileService({
      config: JSON.stringify({
        activePluginId: "jiratempo",
        pluginSettings: { jiratempo: { siteName: "acme" } },
      }),
    });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config.activePluginId).toBe("jiratempo");
    expect(snap.backend.id).toBe("jiratempo");
    expect(snap.backend.findTicketId("ABC-1")).toBe("ABC-1");
  });

  it("normalises an unknown active plugin id to the default plugin", async () => {
    const fs = makeFakeFileService({
      config: JSON.stringify({
        activePluginId: "bogus",
        pluginSettings: { bogus: { foo: "bar" } },
      }),
    });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config.activePluginId).toBe("jiratempo");
    expect(snap.backend.id).toBe("jiratempo");
  });

  it("falls back to defaults when the config on disk is malformed", async () => {
    const fs = makeFakeFileService({ config: "{ not json" });
    const snap = await runWithFs(fs, (svc) => Effect.sync(() => svc.snapshot()));
    expect(snap.config).toEqual(defaultConfig);
  });

  it("setSetting writes to disk and notifies subscribers", async () => {
    const fs = makeFakeFileService();
    const notifications: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() =>
          notifications.push(JSON.stringify(svc.snapshot().config.pluginSettings)),
        );
        yield* svc.setSetting("jiratempo", "siteName", "acme");
      }),
    );
    expect(notifications).toEqual([JSON.stringify({ jiratempo: { siteName: "acme" } })]);
    expect(JSON.parse(fs.state.config)).toEqual({
      activePluginId: "jiratempo",
      pluginSettings: { jiratempo: { siteName: "acme" } },
      themeMode: "system",
    });
  });

  it("setThemeMode writes to disk and notifies", async () => {
    const fs = makeFakeFileService();
    const modes: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => modes.push(svc.snapshot().config.themeMode));
        yield* svc.setThemeMode("dark");
      }),
    );
    expect(modes).toEqual(["dark"]);
    expect(JSON.parse(fs.state.config).themeMode).toBe("dark");
  });

  it("setActivePluginId writes to disk and notifies", async () => {
    const fs = makeFakeFileService();
    const ids: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        svc.subscribe(() => ids.push(svc.snapshot().config.activePluginId));
        yield* svc.setActivePluginId("other");
      }),
    );
    expect(ids).toEqual(["other"]);
    expect(JSON.parse(fs.state.config).activePluginId).toBe("other");
  });

  it("subscribe returns an unsubscribe that stops further notifications", async () => {
    const fs = makeFakeFileService();
    const calls: string[] = [];
    await runWithFs(fs, (svc) =>
      Effect.gen(function* () {
        const unsubscribe = svc.subscribe(() => calls.push(svc.snapshot().config.activePluginId));
        yield* svc.setActivePluginId("first");
        unsubscribe();
        yield* svc.setActivePluginId("second");
      }),
    );
    expect(calls).toEqual(["first"]);
  });
});
