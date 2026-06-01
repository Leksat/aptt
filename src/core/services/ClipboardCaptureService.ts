import { readText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { Effect, Either } from "effect";
import { appendNewStart, formatTimeLog, parseTimeLog, type TimeLog } from "../timeLog";
import { ClipboardTriggerService } from "./ClipboardTriggerService";
import { ConfigService } from "./ConfigService";
import { EntriesService } from "./EntriesService";
import { WindowService } from "./WindowService";

export const FOCUS_TEXTAREA_EVENT = "aptt:focus-textarea";

export class ClipboardCaptureService extends Effect.Service<ClipboardCaptureService>()(
  "ClipboardCaptureService",
  {
    dependencies: [
      ClipboardTriggerService.Default,
      ConfigService.Default,
      EntriesService.Default,
      WindowService.Default,
    ],
    effect: Effect.gen(function* () {
      const trigger = yield* ClipboardTriggerService;
      const config = yield* ConfigService;
      const entries = yield* EntriesService;
      const window = yield* WindowService;

      const notify = (body: string) =>
        Effect.tryPromise({
          try: async () => {
            const granted = await isPermissionGranted();
            if (!granted) {
              const result = await requestPermission();
              if (result !== "granted") return;
            }
            sendNotification({ title: "aptt", body });
          },
          catch: (cause) => cause,
        }).pipe(Effect.ignore);

      const doCapture = Effect.gen(function* () {
        const raw = yield* Effect.tryPromise({
          try: () => readText(),
          catch: (cause) => cause,
        }).pipe(Effect.orElseSucceed(() => ""));
        const text = (raw ?? "").trim();
        const submitter = config.snapshot().submitter;
        const id = text === "" ? null : submitter.parseTargetId(text);
        if (id === null) {
          yield* notify("Cannot start time entry: clipboard has no target ID");
          return false;
        }
        const parsed = parseTimeLog(entries.snapshot());
        if (Either.isLeft(parsed)) {
          yield* notify("Cannot start time entry: time log has errors");
          return false;
        }
        const next = withActiveDescription(appendNewStart(parsed.right, new Date()), `${id} `);
        yield* entries.setText(formatTimeLog(next));
        return true;
      });

      const doShowWindow = Effect.gen(function* () {
        yield* window.showAndFocus.pipe(Effect.ignore);
        if (typeof globalThis.window !== "undefined") {
          globalThis.window.dispatchEvent(new CustomEvent(FOCUS_TEXTAREA_EVENT));
        }
      });

      return {
        handleClipboardChange: Effect.gen(function* () {
          const action = yield* trigger.process(Date.now());
          if (action === "capture") {
            const success = yield* doCapture;
            if (success) yield* trigger.armSuccess;
          } else if (action === "showWindow") {
            yield* doShowWindow;
          }
        }),
      };
    }),
  },
) {}

const withActiveDescription = (log: TimeLog, description: string): TimeLog => {
  if (log.active === null) return log;
  return { closed: log.closed, active: { start: log.active.start, description } };
};
