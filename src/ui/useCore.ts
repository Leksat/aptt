import { Effect } from "effect";
import { type ChangeEvent, useCallback, useSyncExternalStore } from "react";
import type { ThemeMode } from "../core/config";
import { runtime } from "../core/runtime";
import { ConfigService, type ConfigSnapshot } from "../core/services/ConfigService";
import { NotesText, TimeLogText } from "../core/services/persistedText";
import { SubmitService } from "../core/services/SubmitService";
import type { SubmitterImpl } from "../core/services/Submitter";
import type { SubmitResult, SubmitState } from "../core/submit";
import { surfaced, surfaceError } from "../core/surfaceError";
import type { TimeLog } from "../core/timeLog";

const resolveServices = Effect.gen(function* () {
  const entries = yield* TimeLogText;
  const notes = yield* NotesText;
  const config = yield* ConfigService;
  const submit = yield* SubmitService;
  return { entries, notes, config, submit };
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
  readonly notes: {
    readonly text: string;
    readonly setText: (value: string) => void;
  };
  readonly config: {
    readonly snapshot: ConfigSnapshot;
    readonly setActivePluginId: (id: string) => void;
    readonly setSetting: (pluginId: string, key: string, value: string) => void;
    readonly setThemeMode: (mode: ThemeMode) => void;
    readonly setIncludeLocalInLogged: (value: boolean) => void;
  };
  readonly submit: {
    readonly state: SubmitState;
    readonly isInFlight: boolean;
    readonly submit: (log: TimeLog, submitter: SubmitterImpl) => Promise<SubmitResult>;
  };
  readonly history: {
    readonly open: () => void;
  };
}

export const useCore = (): Core => {
  const services = requireServices();

  const text = useSyncExternalStore(
    useCallback((listener: () => void) => services.entries.subscribe(listener), [services]),
    useCallback(() => services.entries.snapshot(), [services]),
  );
  const notesText = useSyncExternalStore(
    useCallback((listener: () => void) => services.notes.subscribe(listener), [services]),
    useCallback(() => services.notes.snapshot(), [services]),
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

  const setNotesText = (value: string) => {
    void runtime.runPromise(surfaced("Save failed", services.notes.setText(value)));
  };

  const setActivePluginId = (id: string) => {
    void runtime.runPromise(services.config.setActivePluginId(id));
  };
  const setSetting = (pluginId: string, key: string, value: string) => {
    void runtime.runPromise(services.config.setSetting(pluginId, key, value));
  };
  const setThemeMode = (mode: ThemeMode) => {
    void runtime.runPromise(services.config.setThemeMode(mode));
  };
  const setIncludeLocalInLogged = (value: boolean) => {
    void runtime.runPromise(services.config.setIncludeLocalInLogged(value));
  };

  const submit = async (log: TimeLog, submitter: SubmitterImpl): Promise<SubmitResult> => {
    const result = await runtime.runPromise(services.submit.submit(log, submitter));
    if (result.tag === "error") {
      void runtime.runPromise(surfaceError("Submit failed", result.error.cause));
    }
    return result;
  };

  const openHistory = () => {
    void runtime.runPromise(services.submit.openHistoryDir);
  };

  return {
    entries: { text, setText, onChange },
    notes: { text: notesText, setText: setNotesText },
    config: {
      snapshot: configSnapshot,
      setActivePluginId,
      setSetting,
      setThemeMode,
      setIncludeLocalInLogged,
    },
    submit: {
      state: submitState,
      isInFlight: submitState.tag === "submitting",
      submit,
    },
    history: { open: openHistory },
  };
};
