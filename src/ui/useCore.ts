import { Effect } from "effect";
import { type ChangeEvent, useCallback, useSyncExternalStore } from "react";
import { runtime } from "../core/runtime";
import { ConfigService, type ConfigSnapshot } from "../core/services/ConfigService";
import { EntriesService } from "../core/services/EntriesService";
import { SubmitService } from "../core/services/SubmitService";
import type { SubmitterImpl } from "../core/services/Submitter";
import type { SubmitResult, SubmitState } from "../core/submit";
import { surfaced, surfaceError } from "../core/surfaceError";
import type { TimeLog } from "../core/timeLog";

const resolveServices = Effect.gen(function* () {
  const entries = yield* EntriesService;
  const config = yield* ConfigService;
  const submit = yield* SubmitService;
  return { entries, config, submit };
});

type Services = Effect.Effect.Success<typeof resolveServices>;

let cachedServices: Services | null = null;

export const bootCore = (): Promise<void> =>
  runtime.runPromise(
    Effect.gen(function* () {
      cachedServices = yield* resolveServices;
    }),
  );

const requireServices = (): Services => {
  if (cachedServices === null) throw new Error("Core services not booted");
  return cachedServices;
};

export interface Core {
  readonly entries: {
    readonly text: string;
    readonly setText: (value: string) => void;
    readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  };
  readonly config: {
    readonly snapshot: ConfigSnapshot;
    readonly setActivePluginId: (id: string) => void;
    readonly setSetting: (pluginId: string, key: string, value: string) => void;
  };
  readonly submit: {
    readonly state: SubmitState;
    readonly isInFlight: boolean;
    readonly submit: (log: TimeLog, submitter: SubmitterImpl) => Promise<SubmitResult>;
  };
}

export const useCore = (): Core => {
  const services = requireServices();

  const text = useSyncExternalStore(
    useCallback((listener: () => void) => services.entries.subscribe(listener), [services]),
    useCallback(() => services.entries.snapshot(), [services]),
  );
  const configSnapshot = useSyncExternalStore(
    useCallback((listener: () => void) => services.config.subscribe(listener), [services]),
    useCallback(() => services.config.snapshot(), [services]),
  );
  const submitState = useSyncExternalStore(
    useCallback((listener: () => void) => services.submit.subscribe(listener), [services]),
    useCallback(() => services.submit.snapshot(), [services]),
  );

  const setText = (value: string) => {
    void runtime.runPromise(surfaced("Save failed", services.entries.setText(value)));
  };
  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => setText(event.currentTarget.value);

  const setActivePluginId = (id: string) => {
    void runtime.runPromise(services.config.setActivePluginId(id));
  };
  const setSetting = (pluginId: string, key: string, value: string) => {
    void runtime.runPromise(services.config.setSetting(pluginId, key, value));
  };

  const submit = async (log: TimeLog, submitter: SubmitterImpl): Promise<SubmitResult> => {
    const result = await runtime.runPromise(services.submit.submit(log, submitter));
    if (result.tag === "error") {
      void runtime.runPromise(surfaceError("Submit failed", result.error.cause));
    }
    return result;
  };

  return {
    entries: { text, setText, onChange },
    config: { snapshot: configSnapshot, setActivePluginId, setSetting },
    submit: {
      state: submitState,
      isInFlight: submitState.tag === "submitting",
      submit,
    },
  };
};
