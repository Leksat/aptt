- Overrall: @README.md
- Vocabulary: @CONTEXT.md
- Local env: @.envrc, @devbox.json
- Package: @package.json

## After changes

Run `pnpm check` (tsc + biome --write) and `pnpm test` (vitest) after every change.

## Typing rules

- Max typing — every value's type is known and narrow.
- No `as` casts. If a value's type is uncertain at a boundary, narrow it via control flow or parse it through an Effect Schema.
- No optional props, params, or args unless there are really good reasons for them. Prefer required fields with explicit values.

## Test snapshots

Never `vitest -u` after changing implementation — it silently overwrites snapshots that broke. To accept a specific change, empty its `toMatchInlineSnapshot()` body and re-run; vitest fills only empty ones.

## Dates in tests

Construct `Date`s from ISO strings (`new Date("2026-01-01T10:00:00")`).
