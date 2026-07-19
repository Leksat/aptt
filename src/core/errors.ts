import { Data } from "effect";

export class FileInitError extends Data.TaggedError("FileInitError")<{
  readonly cause: unknown;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class WindowOpError extends Data.TaggedError("WindowOpError")<{
  readonly op: string;
  readonly cause: unknown;
}> {}

export class TrayInitError extends Data.TaggedError("TrayInitError")<{
  readonly cause: unknown;
}> {}

export class TrayOpError extends Data.TaggedError("TrayOpError")<{
  readonly op: string;
  readonly cause: unknown;
}> {}

export class HotkeyRegisterError extends Data.TaggedError("HotkeyRegisterError")<{
  readonly combo: string;
  readonly cause: unknown;
}> {}

export class HotkeyUnregisterError extends Data.TaggedError("HotkeyUnregisterError")<{
  readonly combo: string;
  readonly cause: unknown;
}> {}

export class SubmitError extends Data.TaggedError("SubmitError")<{
  readonly cause: unknown;
}> {}

export class TicketInfoError extends Data.TaggedError("TicketInfoError")<{
  readonly cause: string;
}> {}

export class WeekTotalsError extends Data.TaggedError("WeekTotalsError")<{
  readonly cause: string;
}> {}
