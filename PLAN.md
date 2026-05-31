# PLAN

Working spec for what aptt should do. Each section is a concrete behavioural target. Delete sections as they are implemented; delete the file when empty.

For domain terms see [CONTEXT.md](./CONTEXT.md). For user-facing description see [README.md](./README.md).

## Time log

- Stored on disk as `~/Library/Application Support/com.leksat.aptt/entries.txt`. Loaded into the textarea on startup. Every keystroke writes the textarea contents to disk (no debounce).
- Strict zebra structure: odd lines (1, 3, 5…) are time entry starts; even lines (2, 4, 6…) are time entry descriptions. The parser is positional, not content-driven.
- Time entry start format: `YYYY-MM-DD HH:MM`, 24-hour, fixed width, leading zeros required, local time, no timezone offset.
- Description: any text, single line, may be empty.
- Two terminal shapes:
  - Even line count → the trailing time entry is the active time entry.
  - Odd line count → no active time entry; all entries are closed.
- Empty log is valid.
- A line on an even position that happens to read like a timestamp is still a description.
- A line on an odd position that does not match the time entry start format makes the whole log invalid.

## Submitter plugin interface

Replace the current `Submitter.ts` shape with:

```ts
interface SubmitterImpl {
  readonly id: string;
  readonly parseTargetId: (text: string) => string | null;
  readonly submit: (entry: BillableEntry) => Effect.Effect<void, SubmitError>;
}

interface BillableEntry {
  readonly targetId: string;
  readonly start: Date;
  readonly end: Date;
  readonly comment: string;
}
```

- `parseTargetId` is pure and synchronous. Returns the first target ID found anywhere in the input, or `null`.
- Core decides how to apply it:
  - Clipboard text → take the returned id directly.
  - Description → trim, call `parseTargetId(trimmed)`; accept only if `trimmed.startsWith(id)`; `comment = trimmed.slice(id.length).trim()`. Otherwise the entry is non-billable.
- Plugin registry keeps the existing `SubmitterPlugin` shape (`id`, `displayName`, `settings`, `make`).
- Rename the stub plugin to "Void" (`id: "void"`). Void is the default active plugin on first launch.

## Main window layout

Top to bottom:

- Main area, split vertically:
  - Left: time log textarea.
  - Right: settings pane.
- Buttons row: at minimum, "New" and "Submit".
- Status line.

## "New" button

- Appends the current time as a new time entry start, then puts the cursor on the description line below.
- Closes any previously active time entry as a side effect.

## Submit flow

1. User clicks Submit.
2. Confirm dialog: "Are you sure?" (OK / Cancel).
3. On confirm:
   - Textarea becomes readonly.
   - Parse the log into closed time entries in chronological order.
   - For each closed entry:
     - If billable, send `{ targetId, start, end, comment }` to the active submitter.
     - On success, the entry is removed from the in-memory log (billable or not).
     - On the first error, stop. Show the error in the status line.
   - Rebuild the time log text from: the entry that failed (if any) + every entry not yet attempted + the active entry (if any). Write it back to the textarea.
   - Textarea becomes writable again.
4. Cancel returns to editable state with nothing changed.

Submit is enabled when: the log is valid AND has at least one closed time entry AND no submission is in flight.

## Status line

Single line at the bottom of the window. Priority order (first match wins):

1. Log is invalid → error message (which line and what was expected).
2. Submitting → progress (`Submitting N/M…`). Lingers 3 seconds after the loop ends, then clears.
3. Otherwise → `Total billable: NhMm`.

`Total billable` format:

- Under 1h → `30m`.
- 1h or more → `1h30m` (always include both units).
- Sums durations of all billable time entries (closed + active). Active entry's end = "now" floored to the minute.
- Recomputes on every minute boundary.

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

## Settings UX (right pane)

- Right pane is the settings form.
- Top of the pane: "Submitter:" dropdown listing all registered plugins.
- Below the dropdown: dynamic fields built from the selected plugin's `settings: SettingField[]`. Fields with `secret: true` render as password inputs.
- No save / apply button. Every keystroke immediately:
  1. Writes `config.json` to disk (no debounce).
  2. Rebuilds the active submitter from the new settings.
- `config.json` shape: `{ activePluginId: string, pluginSettings: { [pluginId]: { [key]: string } } }`. Inactive plugins' settings persist so the user can flip back without re-entering.
- Switching the dropdown updates `activePluginId` and re-renders the form with that plugin's stored values.
- If the rebuild fails (`SubmitterInitError`): keep the last good submitter active; surface the init error in the status line; Submit is disabled until the build succeeds again.

## First launch

- No `entries.txt` → empty time log.
- No `config.json` → `activePluginId = "void"`, `pluginSettings = {}`.

## Hotkeys

- `cmd+alt+x` global → toggle window (show + focus / hide). `HotkeyService` exists; needs wiring at startup.
- `cmd+q` → quit.
- Window close button / `cmd+w` → hide window, do not quit.
