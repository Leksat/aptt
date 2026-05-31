import { Effect, Layer } from "effect";
import { type SubmitterInitError, UnknownPluginError } from "../../errors";
import { Submitter, type SubmitterImpl, type SubmitterPlugin } from "../Submitter";
import { voidPlugin } from "./void";

export const plugins: ReadonlyArray<SubmitterPlugin> = [voidPlugin];

const pluginById = (id: string): SubmitterPlugin | undefined => plugins.find((p) => p.id === id);

export const buildSubmitterLayer = (
  pluginId: string,
  settings: Readonly<Record<string, string>>,
): Layer.Layer<Submitter, SubmitterInitError | UnknownPluginError> => {
  const plugin = pluginById(pluginId);
  const make: Effect.Effect<SubmitterImpl, SubmitterInitError | UnknownPluginError> = plugin
    ? plugin.make(settings)
    : Effect.fail(new UnknownPluginError({ pluginId }));
  return Layer.effect(Submitter, make);
};
