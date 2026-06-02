import { FetchHttpClient } from "@effect/platform";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Layer, ManagedRuntime } from "effect";
import { ClipboardCaptureService } from "./services/ClipboardCaptureService";
import { ClipboardTriggerService } from "./services/ClipboardTriggerService";
import { ConfigService } from "./services/ConfigService";
import { EntriesService } from "./services/EntriesService";
import { FileService } from "./services/FileService";
import { HotkeyService } from "./services/HotkeyService";
import { NotesService } from "./services/NotesService";
import { SubmitService } from "./services/SubmitService";
import { TrayService } from "./services/TrayService";
import { WindowService } from "./services/WindowService";

export const MainLive = Layer.mergeAll(
  FileService.Default,
  WindowService.Default,
  TrayService.Default,
  HotkeyService.Default,
  ClipboardTriggerService.Default,
  ClipboardCaptureService.Default,
  ConfigService.Default,
  EntriesService.Default,
  NotesService.Default,
  SubmitService.Default,
  FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, tauriFetch))),
);

export const runtime = ManagedRuntime.make(MainLive);
