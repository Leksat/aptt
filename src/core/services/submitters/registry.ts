import type { SubmitterImpl, SubmitterPlugin } from "../Submitter";
import { echoPlugin } from "./echo";
import { voidPlugin } from "./void";

export const defaultPlugin: SubmitterPlugin = voidPlugin;

export const plugins: ReadonlyArray<SubmitterPlugin> = [voidPlugin, echoPlugin];

export const pluginById = (id: string): SubmitterPlugin =>
  plugins.find((p) => p.id === id) ?? defaultPlugin;

export const buildSubmitter = (
  pluginId: string,
  settings: Readonly<Record<string, string>>,
): SubmitterImpl => pluginById(pluginId).make(settings);
