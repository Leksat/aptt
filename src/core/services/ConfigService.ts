import { Effect, Either } from "effect";
import {
  type Config,
  defaultConfig,
  parseConfig,
  settingsFor,
  type ThemeMode,
  withActivePluginId,
  withSetting,
  withThemeMode,
} from "../config";
import { surfaced } from "../surfaceError";
import { FileService } from "./FileService";
import type { SubmitterImpl } from "./Submitter";
import { buildSubmitter, defaultPlugin, pluginById } from "./submitters/registry";

export interface ConfigSnapshot {
  readonly config: Config;
  readonly submitter: SubmitterImpl;
}

export class ConfigService extends Effect.Service<ConfigService>()("ConfigService", {
  dependencies: [FileService.Default],
  effect: Effect.gen(function* () {
    const fs = yield* FileService;

    const snapshotOf = (config: Config): ConfigSnapshot => ({
      config,
      submitter: buildSubmitter(config.activePluginId, settingsFor(config, config.activePluginId)),
    });

    const loaded = yield* loadInitial(fs.readConfig);
    const initial =
      pluginById(loaded.activePluginId).id === loaded.activePluginId
        ? loaded
        : withActivePluginId(loaded, defaultPlugin.id);

    let state: ConfigSnapshot = snapshotOf(initial);
    const listeners = new Set<() => void>();
    const notify = () => {
      for (const l of listeners) l();
    };

    const apply = (next: Config) =>
      Effect.gen(function* () {
        yield* surfaced(
          "Failed to write config.json",
          fs.writeConfig(`${JSON.stringify(next, null, 2)}\n`),
        );
        state = snapshotOf(next);
        notify();
      });

    return {
      snapshot: (): ConfigSnapshot => state,
      subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      setActivePluginId: (id: string) => apply(withActivePluginId(state.config, id)),
      setSetting: (pluginId: string, key: string, value: string) =>
        apply(withSetting(state.config, pluginId, key, value)),
      setThemeMode: (mode: ThemeMode) => apply(withThemeMode(state.config, mode)),
    } as const;
  }),
}) {}

const loadInitial = (read: Effect.Effect<string, unknown>) =>
  Effect.gen(function* () {
    const raw = yield* read.pipe(Effect.orElseSucceed(() => ""));
    if (raw.trim() === "") return defaultConfig;
    const parsed = parseUnknown(raw);
    if (Either.isLeft(parsed)) {
      yield* Effect.logWarning(`config.json invalid, using defaults: ${String(parsed.left)}`);
      return defaultConfig;
    }
    return parsed.right;
  });

const parseUnknown = (raw: string): Either.Either<Config, unknown> => {
  try {
    const json: unknown = JSON.parse(raw);
    const decoded = parseConfig(json);
    if (Either.isLeft(decoded)) return Either.left(decoded.left);
    return Either.right(decoded.right);
  } catch (cause) {
    return Either.left(cause);
  }
};
