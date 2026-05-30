@README.md

Tools (node, pnpm, cargo, etc) are auto-loaded into environment via direnv when user cd into the project root.

## Typing rules

- Max typing — every value's type is known and narrow.
- No `as` casts. If a value's type is uncertain at a boundary, narrow it via control flow or parse it through an Effect Schema.
- No optional props, params, or args unless absolutely required. Prefer required fields with explicit values.

## Architecture

Aim for deep modules. The goal is testability and AI-navigability — change, bugs, and knowledge should concentrate in one place.

### Vocabulary (use these exact terms — don't drift to "component," "service," "API," or "boundary")

- Module — anything with an interface and an implementation. Scale-agnostic: function, class, package, slice.
- Interface — everything a caller must know to use the module correctly: type signature plus invariants, ordering, error modes, required config, perf characteristics. Not just the type-level surface.
- Implementation — the code inside.
- Depth — leverage at the interface: lots of behaviour behind a small interface. Deep = high leverage. Shallow = interface nearly as complex as the implementation.
- Seam (Feathers) — a place behaviour can be altered without editing in place. Where an interface lives. Say "seam," not "boundary."
- Adapter — a concrete thing satisfying an interface at a seam. Describes role, not substance.
- Leverage — what callers get from depth: capability per unit of interface they must learn.
- Locality — what maintainers get from depth: change/bugs/knowledge concentrated, fix once = fixed everywhere.

### Principles

- Depth is a property of the interface, not the implementation. A deep module may internally be small composed parts — they just aren't in the interface. Internal seams (used by the module's own tests) are fine; don't promote them to the external interface.
- Deletion test. Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- The interface is the test surface. Callers and tests cross the same seam. Wanting to test past the interface means the module is the wrong shape.
- One adapter = hypothetical seam. Two adapters = real seam. Don't introduce a port unless something actually varies across it (typically production + test).
- Pure-function extraction "for testability" is a smell when real bugs hide in how the function is called — that destroys locality. Test through the interface that owns the behaviour.

### Deepening dependencies

When merging shallow modules into a deeper one, classify the dependencies — this drives the testing strategy:

1. In-process — pure computation, in-memory state, no I/O. Always deepenable; test through the new interface directly, no adapter.
2. Local-substitutable — has a local stand-in (PGLite, in-memory FS). Deepenable; tests run the stand-in. Seam is internal, not exposed at the external interface.
3. Remote but owned — your own services across a network. Define a port at the seam; inject the transport as an adapter. In-memory adapter for tests, HTTP/gRPC/queue for production.
4. True external — third-party services you don't control. Port + injected adapter; mock in tests.

### Testing strategy: replace, don't layer

- Old tests on shallow modules become waste once the deepened interface has tests — delete them.
- Assert on observable outcomes through the interface, not internal state.
- A test that must change when the implementation changes is testing past the interface.

### Designing an interface — design it twice

First idea is unlikely to be best (Ousterhout). When the interface matters, sketch at least two radically different shapes and contrast them by depth (leverage at the interface), locality (where change concentrates), and seam placement. Then pick — opinionated, not a menu.
