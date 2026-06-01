import { Schema } from "effect";
import { defaultPlugin } from "./services/submitters/registry";

export const ConfigSchema = Schema.Struct({
  activePluginId: Schema.String,
  pluginSettings: Schema.Record({
    key: Schema.String,
    value: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
});

export type Config = typeof ConfigSchema.Type;

export const defaultConfig: Config = {
  activePluginId: defaultPlugin.id,
  pluginSettings: {},
};

export const parseConfig = Schema.decodeUnknownEither(ConfigSchema);
export const encodeConfig = Schema.encodeSync(ConfigSchema);

export const settingsFor = (config: Config, pluginId: string): Readonly<Record<string, string>> =>
  config.pluginSettings[pluginId] ?? {};

export const withActivePluginId = (config: Config, pluginId: string): Config => ({
  ...config,
  activePluginId: pluginId,
});

export const withSetting = (
  config: Config,
  pluginId: string,
  key: string,
  value: string,
): Config => ({
  ...config,
  pluginSettings: {
    ...config.pluginSettings,
    [pluginId]: {
      ...(config.pluginSettings[pluginId] ?? {}),
      [key]: value,
    },
  },
});
