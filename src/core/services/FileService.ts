import { appDataDir } from "@tauri-apps/api/path";
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { FileInitError, FileReadError, FileWriteError } from "../errors";

const ENTRIES = "entries.txt";
const CONFIG = "config.json";

const readOrEmpty = (path: string) =>
  Effect.gen(function* () {
    const present = yield* Effect.tryPromise({
      try: () => exists(path, { baseDir: BaseDirectory.AppData }),
      catch: (cause) => new FileReadError({ path, cause }),
    });
    if (!present) return "";
    return yield* Effect.tryPromise({
      try: () => readTextFile(path, { baseDir: BaseDirectory.AppData }),
      catch: (cause) => new FileReadError({ path, cause }),
    });
  });

const writeText = (path: string, contents: string) =>
  Effect.tryPromise({
    try: () => writeTextFile(path, contents, { baseDir: BaseDirectory.AppData }),
    catch: (cause) => new FileWriteError({ path, cause }),
  });

export class FileService extends Effect.Service<FileService>()("FileService", {
  effect: Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: async () => {
        const dir = await appDataDir();
        await mkdir(dir, { recursive: true });
      },
      catch: (cause) => new FileInitError({ cause }),
    }).pipe(Effect.orElse(() => Effect.void));

    return {
      readEntries: readOrEmpty(ENTRIES),
      writeEntries: (text: string) => writeText(ENTRIES, text),
      readConfig: readOrEmpty(CONFIG),
      writeConfig: (json: string) => writeText(CONFIG, json),
    };
  }),
}) {}
