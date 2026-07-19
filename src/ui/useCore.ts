import { Effect } from "effect";
import { type ChangeEvent, useCallback, useMemo, useSyncExternalStore } from "react";
import type { ThemeMode } from "../core/config";
import { runtime } from "../core/runtime";
import type { Backend } from "../core/services/Backend";
import { ConfigService, type ConfigSnapshot } from "../core/services/ConfigService";
import { FileService } from "../core/services/FileService";
import { NotesText, TimeLogText } from "../core/services/persistedText";
import { SubmitService } from "../core/services/SubmitService";
import { WeekTotalsService, type WeekTotalsState } from "../core/services/WeekTotalsService";
import type { SubmitResult, SubmitState } from "../core/submit";
import { surfaced, surfaceError } from "../core/surfaceError";
import type { TimeLog } from "../core/timeLog";
import { currentWeekRange } from "../core/week";

const resolveServices = Effect.gen(function* () {
  const entries = yield* TimeLogText;
  const notes = yield* NotesText;
  const config = yield* ConfigService;
  const submit = yield* SubmitService;
  const weekTotals = yield* WeekTotalsService;
  const files = yield* FileService;
  return { entries, notes, config, submit, weekTotals, files };
});

type Services = Effect.Effect.Success<typeof resolveServices>;

let cachedServices: Services | null = null;

export const bootCore = (): Promise<void> =>
  runtime.runPromise(
    Effect.gen(function* () {
      const services = yield* resolveServices;
      cachedServices = services;
      yield* Effect.forkDaemon(
        services.weekTotals.refresh(
          services.config.snapshot().backend,
          currentWeekRange(new Date()),
        ),
      );
    }),
  );

const refreshWeekTotals = (services: Services): void => {
  void runtime.runPromise(
    services.weekTotals.refresh(services.config.snapshot().backend, currentWeekRange(new Date())),
  );
};

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
  };
  readonly submit: {
    readonly state: SubmitState;
    readonly isInFlight: boolean;
    readonly submit: (log: TimeLog, backend: Backend) => Promise<SubmitResult>;
  };
  readonly weekTotals: {
    readonly state: WeekTotalsState;
  };
  readonly history: {
    readonly open: () => void;
    readonly list: () => Promise<string[]>;
    readonly read: (filename: string) => Promise<string>;
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
  const weekTotalsState = useSyncExternalStore(
    useCallback((listener: () => void) => services.weekTotals.subscribe(listener), [services]),
    useCallback(() => services.weekTotals.snapshot(), [services]),
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

  const submit = async (log: TimeLog, backend: Backend): Promise<SubmitResult> => {
    const result = await runtime.runPromise(services.submit.submit(log, backend));
    if (result.tag === "error") {
      void runtime.runPromise(surfaceError("Submit failed", result.error.cause));
    } else {
      refreshWeekTotals(services);
    }
    return result;
  };

  const history = useMemo(
    () => ({
      open: () => {
        void runtime.runPromise(services.files.openHistoryDir.pipe(Effect.ignore));
      },
      list: (): Promise<string[]> =>
        runtime.runPromise(
          services.files.listHistory.pipe(Effect.orElse(() => Effect.succeed<string[]>([]))),
        ),
      read: (filename: string): Promise<string> =>
        runtime.runPromise(services.files.readHistory(filename)),
    }),
    [services],
  );

  return {
    entries: { text, setText, onChange },
    notes: { text: notesText, setText: setNotesText },
    config: {
      snapshot: configSnapshot,
      setActivePluginId,
      setSetting,
      setThemeMode,
    },
    submit: {
      state: submitState,
      isInFlight: submitState.tag === "submitting",
      submit,
    },
    weekTotals: { state: weekTotalsState },
    history,
  };
};
