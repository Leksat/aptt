# Target info lookup via SubmitterImpl

The extended-info tooltip needs to fetch ticket-like data (title, URL, estimate, externally-logged time) for the target ID of a time entry. Three shapes were considered: extend `SubmitterImpl` with a required `fetchTargetInfo` method; return a sibling capability `{ submitter, targetInfo }` from the plugin's `make()`; or introduce a separate `TargetInfoService` that the active plugin registers a source into. We chose the first.

The Submitter already owns "what a target ID is" via `findTargetId`. Knowing what one looks like in the external system is the same module's responsibility; splitting it adds a seam with no behaviour varying across it — a deletion test of a sibling service shows complexity does not vanish, it relocates to the single consumer (the tooltip). One seam (`SubmitterImpl`), two real adapters (JiraTempo + void with the test stubs), satisfies the "no port unless something varies across it" rule. `voidPlugin.fetchTargetInfo` returns `null` so the tooltip's target-info card is hidden when the active submitter has no remote concept, which keeps the field required (no optional props) while still letting plugins opt out.

The cost is that every future submitter must implement `fetchTargetInfo`. For a personal-use tool with a small, stable submitter set, that's a fair price for keeping target-ID semantics in one place.
