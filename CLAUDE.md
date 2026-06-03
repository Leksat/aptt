- Overrall: @README.md
- Vocabulary: @CONTEXT.md
- Local env: @.envrc, @devbox.json
- Package: package.json

## After changes

Run `pnpm check` (tsc + biome --write) and `pnpm test` (vitest) after every change.

## Typing rules

- Max typing — every value's type is known and narrow.
- No `as` casts. If a value's type is uncertain at a boundary, narrow it via control flow or parse it through an Effect Schema.
- No optional props, params, or args unless there are really good reasons for them. Prefer required fields with explicit values.

## Architecture

Aim for deep modules. Goal: testability and AI-navigability — change, bugs, and knowledge concentrate in one place.

### Vocabulary (use exactly — not "component," "service," "API," or "boundary")

- Module — anything with an interface and an implementation. Scale-agnostic: function, class, package, slice. Has exactly one interface.
- Interface — everything a caller must know: types, invariants, ordering, error modes, required config, perf. Not just the type signature.
- Implementation — code inside. Distinct from adapter: a small adapter can have a large implementation (Postgres repo); a large adapter can have a small one (in-memory fake). Reach for "adapter" when the seam is the topic.
- Depth — leverage at the interface: lots of behaviour behind a small interface. Deep = high leverage. Shallow = interface nearly as complex as the implementation. (Not a line-count ratio — that rewards padding.)
- Seam (Feathers) — where an interface lives; a place behaviour can be altered without editing in place. Say "seam," not "boundary" (overloaded with DDD).
- Adapter — a concrete thing satisfying an interface at a seam. Role, not substance.
- Leverage — what callers get from depth.
- Locality — what maintainers get from depth: fix once = fixed everywhere.

### Principles

- Depth is a property of the interface, not the implementation. A deep module can be internally composed; those internal seams (used by the module's own tests) stay private — don't promote them to the external interface.
- Deletion test. Delete the module mentally. Complexity vanishes → it was a pass-through. Complexity reappears across N callers → it was earning its keep.
- The interface is the test surface. Wanting to test past it means the module is the wrong shape.
- One adapter = hypothetical seam. Two = real. No port unless something actually varies across it (typically production + test).
- Pure-function extraction "for testability" is a smell when real bugs hide in how it's called — that destroys locality. Test through the interface that owns the behaviour.
- Export only what outside callers use. `export` is part of the interface; default off, add when a caller appears.

### Deepening dependencies

Classify dependencies when merging — drives the test strategy:

1. In-process — pure / in-memory. Test through the new interface directly, no adapter.
2. Local-substitutable — has a local stand-in (PGLite, in-memory FS). Stand-in runs in tests; seam stays internal.
3. Remote but owned — your services across a network. Port at the seam; in-memory adapter for tests, HTTP/gRPC/queue for production.
4. True external — third-party (Stripe, Twilio). Port + injected mock in tests.

### Testing: replace, don't layer

Old tests on shallow modules become waste once the deepened interface has tests — delete them. Assert on observable outcomes through the interface. A test that must change when the implementation changes is testing past the interface.

### Design it twice

First idea is unlikely to be best (Ousterhout). When the interface matters, sketch at least two radically different shapes — e.g. one minimising entry points, one optimising the common caller — and contrast by depth, locality, and seam placement. Pick opinionated, not a menu.

## Test snapshots

Never `vitest -u` after changing implementation — it silently overwrites snapshots that broke. To accept a specific change, empty its `toMatchInlineSnapshot()` body and re-run; vitest fills only empty ones.

## Dates in tests

Construct `Date`s from ISO strings (`new Date("2026-01-01T10:00:00")`).
