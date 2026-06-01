import { Effect } from "effect";
import { FileService } from "./FileService";

export class EntriesService extends Effect.Service<EntriesService>()("EntriesService", {
  dependencies: [FileService.Default],
  effect: Effect.gen(function* () {
    const fs = yield* FileService;

    let text = yield* fs.readEntries.pipe(Effect.orElseSucceed(() => ""));
    const listeners = new Set<() => void>();
    const notify = () => {
      for (const l of listeners) l();
    };

    return {
      snapshot: (): string => text,
      subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      setText: (value: string) =>
        Effect.gen(function* () {
          if (value === text) return;
          text = value;
          notify();
          yield* fs.writeEntries(value);
        }),
    } as const;
  }),
}) {}
