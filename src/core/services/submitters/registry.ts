import type { SubmitterImpl, SubmitterPlugin } from "../Submitter";
import { jiraTempoPlugin } from "./jiraTempo";

export const defaultPlugin: SubmitterPlugin = jiraTempoPlugin;

export const plugins: ReadonlyArray<SubmitterPlugin> = [jiraTempoPlugin];

export const pluginById = (id: string): SubmitterPlugin =>
  plugins.find((p) => p.id === id) ?? defaultPlugin;

export const buildSubmitter = (
  pluginId: string,
  settings: Readonly<Record<string, string>>,
): SubmitterImpl => pluginById(pluginId).make(settings);
