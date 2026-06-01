# PLAN

Working spec for what aptt should do. Each section is a concrete behavioural target. Delete sections as they are implemented; delete the file when empty.

For domain terms see [CONTEXT.md](./CONTEXT.md). For user-facing description see [README.md](./README.md).

## Tray title

- Active time entry has a billable target ID → show that target ID (e.g. `ABC-123`).
- Otherwise → icon only, no text.
- Updates whenever the time log changes or the active submitter changes.

## Clipboard magic (double / triple cmd+c)

Three clipboard events within 500ms windows:

- Press 1 → noted; no aptt action.
- Press 2 (within 500ms of press 1):
  - Read the clipboard text.
  - Call active submitter's `parseTargetId`.
  - If an id is returned, append a new time entry to the log with the current time as start and the id as description. (This closes any previously active entry.)
  - If no id, show a macOS native notification ("No target ID found in clipboard").
- Press 3 (within 500ms of press 2):
  - Only fires if press 2 created a time entry.
  - Brings the window to focus, focuses the textarea, places cursor at the end of the log.
- Implementation note: detection is via clipboard-change polling, not a registered global shortcut (registering cmd+c globally would suppress the system copy).

## Audit silent error swallowing

Walk every `runPromise` / `.catch` / `Effect.ignore` site and make sure failures surface (log or UI). No silent drops.
