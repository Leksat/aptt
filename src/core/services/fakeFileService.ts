import { Effect, Layer } from "effect";
import { FileService } from "./FileService";

export interface FakeFileService {
  readonly layer: Layer.Layer<FileService>;
  readonly state: {
    entries: string;
    notes: string;
    config: string;
    history: Record<string, string>;
  };
}

export const makeFakeFileService = (
  init: { entries?: string; notes?: string; config?: string } = {},
): FakeFileService => {
  const state = {
    entries: init.entries ?? "",
    notes: init.notes ?? "",
    config: init.config ?? "",
    history: {} as Record<string, string>,
  };
  const layer = Layer.succeed(
    FileService,
    FileService.make({
      readEntries: Effect.sync(() => state.entries),
      writeEntries: (text: string) =>
        Effect.sync(() => {
          state.entries = text;
        }),
      readNotes: Effect.sync(() => state.notes),
      writeNotes: (text: string) =>
        Effect.sync(() => {
          state.notes = text;
        }),
      readConfig: Effect.sync(() => state.config),
      writeConfig: (json: string) =>
        Effect.sync(() => {
          state.config = json;
        }),
      writeHistory: (filename: string, contents: string) =>
        Effect.sync(() => {
          state.history[filename] = contents;
        }),
      listHistory: Effect.sync(() => Object.keys(state.history)),
      readHistory: (filename: string) => Effect.sync(() => state.history[filename] ?? ""),
      openHistoryDir: Effect.void,
    }),
  );
  return { layer, state };
};
