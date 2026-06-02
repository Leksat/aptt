import { appDataDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { Effect } from "effect";
import { FileInitError, FileReadError, FileWriteError } from "../errors";

const ensureDir = (path: string) =>
  Effect.tryPromise({
    try: () => mkdir(path, { baseDir: BaseDirectory.AppData, recursive: true }),
    catch: (cause) => new FileInitError({ cause }),
  });

const ENTRIES = "entries.txt";
const NOTES = "notes.txt";
const CONFIG = "config.json";
const HISTORY_DIR = "history";

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
    yield* ensureDir(HISTORY_DIR).pipe(Effect.orElse(() => Effect.void));

    return {
      readEntries: readOrEmpty(ENTRIES),
      writeEntries: (text: string) => writeText(ENTRIES, text),
      readNotes: readOrEmpty(NOTES),
      writeNotes: (text: string) => writeText(NOTES, text),
      readConfig: readOrEmpty(CONFIG),
      writeConfig: (json: string) => writeText(CONFIG, json),
      writeHistory: (filename: string, contents: string) =>
        writeText(`${HISTORY_DIR}/${filename}`, contents),
      openHistoryDir: Effect.tryPromise({
        try: async () => {
          const path = await join(await appDataDir(), HISTORY_DIR);
          await openPath(path);
        },
        catch: (cause) => new FileReadError({ path: HISTORY_DIR, cause }),
      }),
    };
  }),
}) {}
