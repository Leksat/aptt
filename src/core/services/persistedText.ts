import { Context, Effect, Layer } from "effect";
import type { FileWriteError } from "../errors";
import { FileService } from "./FileService";

export interface PersistedText {
  readonly snapshot: () => string;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setText: (value: string) => Effect.Effect<void, FileWriteError>;
}

export const makePersistedText = (args: {
  readonly read: Effect.Effect<string>;
  readonly write: (text: string) => Effect.Effect<void, FileWriteError>;
}): Effect.Effect<PersistedText> =>
  Effect.gen(function* () {
    let text = yield* args.read;
    const listeners = new Set<() => void>();
    const notify = () => {
      for (const l of listeners) l();
    };
    return {
      snapshot: () => text,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      setText: (value) =>
        Effect.gen(function* () {
          if (value === text) return;
          text = value;
          notify();
          yield* args.write(value);
        }),
    };
  });

export class TimeLogText extends Context.Tag("TimeLogText")<TimeLogText, PersistedText>() {}

export const TimeLogTextLive = Layer.effect(
  TimeLogText,
  Effect.gen(function* () {
    const fs = yield* FileService;
    return yield* makePersistedText({
      read: fs.readEntries.pipe(Effect.orElseSucceed(() => "")),
      write: fs.writeEntries,
    });
  }),
).pipe(Layer.provide(FileService.Default));

export class NotesText extends Context.Tag("NotesText")<NotesText, PersistedText>() {}

export const NotesTextLive = Layer.effect(
  NotesText,
  Effect.gen(function* () {
    const fs = yield* FileService;
    return yield* makePersistedText({
      read: fs.readNotes.pipe(Effect.orElseSucceed(() => "")),
      write: fs.writeNotes,
    });
  }),
).pipe(Layer.provide(FileService.Default));
