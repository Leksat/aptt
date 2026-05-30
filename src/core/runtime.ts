import { Layer, ManagedRuntime } from "effect";
import { ClipboardTriggerService } from "./services/ClipboardTriggerService";
import { FileService } from "./services/FileService";
import { HotkeyService } from "./services/HotkeyService";
import { buildSubmitterLayer } from "./services/submitters/registry";
import { TrayService } from "./services/TrayService";
import { WindowService } from "./services/WindowService";

export const MainLive = Layer.mergeAll(
  FileService.Default,
  WindowService.Default,
  TrayService.Default,
  HotkeyService.Default,
  ClipboardTriggerService.Default,
  buildSubmitterLayer("stub", {}),
);

export const runtime = ManagedRuntime.make(MainLive);
