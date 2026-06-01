import { Effect, Layer } from "effect";
import { FileService } from "./FileService";

export interface FakeFileService {
  readonly layer: Layer.Layer<FileService>;
  readonly state: { entries: string; config: string };
}

export const makeFakeFileService = (
  init: { entries?: string; config?: string } = {},
): FakeFileService => {
  const state = { entries: init.entries ?? "", config: init.config ?? "" };
  const layer = Layer.succeed(
    FileService,
    FileService.make({
      readEntries: Effect.sync(() => state.entries),
      writeEntries: (text: string) =>
        Effect.sync(() => {
          state.entries = text;
        }),
      readConfig: Effect.sync(() => state.config),
      writeConfig: (json: string) =>
        Effect.sync(() => {
          state.config = json;
        }),
    }),
  );
  return { layer, state };
};
