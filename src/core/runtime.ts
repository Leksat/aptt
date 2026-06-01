import { Layer, ManagedRuntime } from "effect";
import { ClipboardCaptureService } from "./services/ClipboardCaptureService";
import { ClipboardTriggerService } from "./services/ClipboardTriggerService";
import { ConfigService } from "./services/ConfigService";
import { EntriesService } from "./services/EntriesService";
import { FileService } from "./services/FileService";
import { HotkeyService } from "./services/HotkeyService";
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
  SubmitService.Default,
);

export const runtime = ManagedRuntime.make(MainLive);
