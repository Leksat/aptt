@README.md

Tools (node, pnpm, cargo, etc) are auto-loaded into environment via direnv when user cd into the project root.

## Typing rules

- Max typing — every value's type is known and narrow.
- No `as` casts. If a value's type is uncertain at a boundary, narrow it via control flow or parse it through an Effect Schema.
- No optional props, params, or args unless absolutely required. Prefer required fields with explicit values.
