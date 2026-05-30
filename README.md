# aptt

A Perfect Time Tracker. Personal-use macOS app.

A single text buffer where you type time records in a known format. No timer. Submit entries to an external system (Jira, Toggl, etc.) and they disappear from the buffer. The textarea is the source of truth; every edit is mirrored to a text file on disk for persistence.

## How it works

- `cmd+alt+x` toggles the window.
- Menu bar item with a dynamic title is always present.
- `cmd+c` listener: second press within 500ms acts on the clipboard; third press brings the window to the front.
- Closing the window hides it; `cmd+q` quits.

## Submitters

Pluggable, one active at a time. Each plugin declares its own key/value settings. Adding a submitter is one new file in `src/core/services/submitters/`. First plugin is a stub.

## Architecture

- `src-tauri/` — Rust. As thin as possible.
- `src/core/` — pure TypeScript on Effect. Schemas, services, runtime.
- `src/ui/` — React. Dumb components.

Data lives at `~/Library/Application Support/com.leksat.aptt/`.

## Stack

Tauri 2, React, TypeScript (strict), Effect, Tailwind v4, Biome, Vitest. Toolchain via devbox + direnv.
