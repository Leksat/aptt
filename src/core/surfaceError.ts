import { message } from "@tauri-apps/plugin-dialog";
import { Effect } from "effect";

export const surfaceError = (label: string, err: unknown) =>
  Effect.gen(function* () {
    yield* Effect.logError(label, err);
    yield* Effect.tryPromise({
      try: () => message(`${label}\n\n${formatError(err)}`, { title: "aptt", kind: "error" }),
      catch: (cause) => cause,
    }).pipe(
      Effect.tapError((cause) => Effect.logError("dialog failed", cause)),
      Effect.ignore,
    );
  });

export const surfaced = <A, E, R>(label: string, effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.tapError((err) => surfaceError(label, err)),
    Effect.orElseSucceed((): A | undefined => undefined),
  );

const formatError = (err: unknown): string => {
  if (typeof err === "string") return err;
  const parts: string[] = [];
  if (err instanceof Error && err.message) parts.push(err.message);
  try {
    const json = JSON.stringify(err, null, 2);
    if (json !== undefined && json !== "{}") parts.push(json);
  } catch {
    /* fall through */
  }
  return parts.length > 0 ? parts.join("\n\n") : String(err);
};
