# aptt

A Perfect Time Tracker. Personal-use macOS app.

A single time log where you type time entries in a known format. No timer. Submit closed entries to an external system (Jira, Toggl, etc.) and they disappear from the log. The textarea is the source of truth.

## How it works

- `cmd+alt+x` toggles the window.
- Clipboard capture:
  - copy a target (e.g. a Jira key)
  - copy again within 500ms to start a new time entry against it
  - copy a third time within 500ms to bring the window to the front with the textarea focused

## Architecture

- `src-tauri/` — Rust. As thin as possible.
- `src/core/` — pure TypeScript on Effect. Schemas, services, runtime.
- `src/ui/` — React. Dumb components.

Data lives at `~/Library/Application Support/com.leksat.aptt/`.

## Development

See CLAUDE.md.
