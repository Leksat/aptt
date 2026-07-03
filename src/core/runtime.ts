import { FetchHttpClient } from "@effect/platform";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Layer, ManagedRuntime } from "effect";
import { ClipboardCaptureService } from "./services/ClipboardCaptureService";
import { ClipboardTriggerService } from "./services/ClipboardTriggerService";
import { ConfigService } from "./services/ConfigService";
import { FileService } from "./services/FileService";
import { HotkeyService } from "./services/HotkeyService";
import { NotesTextLive, TimeLogTextLive } from "./services/persistedText";
import { SubmitService } from "./services/SubmitService";
import { TrayService } from "./services/TrayService";
import { WeekTotalsService } from "./services/WeekTotalsService";
import { WindowService } from "./services/WindowService";

export const MainLive = Layer.mergeAll(
  FileService.Default,
  WindowService.Default,
  TrayService.Default,
  HotkeyService.Default,
  ClipboardTriggerService.Default,
  ClipboardCaptureService.Default,
  ConfigService.Default,
  TimeLogTextLive,
  NotesTextLive,
  SubmitService.Default,
  WeekTotalsService.Default,
  FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, tauriFetch))),
);

export const runtime = ManagedRuntime.make(MainLive);
