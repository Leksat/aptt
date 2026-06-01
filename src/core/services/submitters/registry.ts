import type { SubmitterImpl, SubmitterPlugin } from "../Submitter";
import { jiraTempoPlugin } from "./jiraTempo";
import { voidPlugin } from "./void";

export const defaultPlugin: SubmitterPlugin = jiraTempoPlugin;

const allPlugins: ReadonlyArray<SubmitterPlugin> = [jiraTempoPlugin, voidPlugin];

export const plugins: ReadonlyArray<SubmitterPlugin> = import.meta.env.DEV
  ? allPlugins
  : allPlugins.filter((p) => !p.dev);

export const pluginById = (id: string): SubmitterPlugin =>
  plugins.find((p) => p.id === id) ?? defaultPlugin;

export const buildSubmitter = (
  pluginId: string,
  settings: Readonly<Record<string, string>>,
): SubmitterImpl => pluginById(pluginId).make(settings);
