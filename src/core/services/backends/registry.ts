import type { Backend, BackendPlugin } from "../Backend";
import { jiraTempoPlugin } from "./jiraTempo";
import { voidPlugin } from "./void";

export const defaultPlugin: BackendPlugin = jiraTempoPlugin;

const allPlugins: ReadonlyArray<BackendPlugin> = [jiraTempoPlugin, voidPlugin];

export const plugins: ReadonlyArray<BackendPlugin> = import.meta.env.DEV
  ? allPlugins
  : allPlugins.filter((p) => !p.dev);

export const pluginById = (id: string): BackendPlugin =>
  plugins.find((p) => p.id === id) ?? defaultPlugin;

export const buildBackend = (
  pluginId: string,
  settings: Readonly<Record<string, string>>,
): Backend => pluginById(pluginId).make(settings);
