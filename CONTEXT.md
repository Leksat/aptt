# aptt

See [README.md](./README.md) for what aptt is.

## Language

**Time log**:
The textarea contents: a chronological list of time entries the user is recording or about to submit. Mirrored to `entries.txt` on disk.
_Avoid_: buffer, journal, sheet, document.

**Time entry**:
One time entry start plus the description that follows it, up to the next time entry start. Has a start time but no explicit end — its end is the next time entry start (or "now" if it is active).
_Avoid_: activity, segment, record, block.

**Time entry start**:
A line of the form `YYYY-MM-DD HH:MM`. Marks a wall-clock moment. Anchors the beginning of one time entry and the end of the previous one. A trailing start (last line of the log, no description below) closes the previous time entry and opens a new active time entry whose description is empty.
_Avoid_: marker, boundary, header, timestamp.

**Time entry description**:
The body of a time entry — everything between its start and the next start. Its first token is tested as a ticket ID; if the active submitter accepts it, the entry is billable. Otherwise the description is just there to carve time out of the log (e.g. `nothing`, empty).
_Avoid_: body, content, text, note.

**Ticket ID**:
The identifier of the external thing time is being logged against (e.g. `ABC-123` for a Jira issue). The active submitter decides what counts as a valid ticket ID — the Jira submitter accepts issue keys, a Toggl submitter would accept project identifiers, etc. Lives as the first token of a time entry description.
_Avoid_: issue key, reference, subject.

**Active time entry**:
The trailing time entry of a non-empty log. Its end is "now" and it is never submitted. Its description is the line after its start, or empty if the log ends on the start itself. The empty log has no active time entry.
_Avoid_: current entry, in-progress entry, open entry.

**Billable**:
A time entry whose description begins with a valid ticket ID for the active submitter. Only closed billable entries are submitted; non-billable closed entries are removed without being sent. The active entry can also be billable; its running duration counts toward live totals even though it is never submitted.
_Avoid_: loggable, sendable.

**Duration**:
The elapsed time of a time entry — `end - start` for a closed entry, `now - start` for the active time entry (recomputed each minute, shown literally even when negative because the start is in the future). Rendered as a read-only annotation after each time entry start in the time log.
_Avoid_: elapsed, length, span.

**Blocker**:
A `!` appearing as its own whitespace-delimited token at the start of a time entry's description (e.g. `! stuff`) or immediately after the ticket ID (e.g. `ABC-123 ! stuff`). A `!` attached to another token (e.g. `!stuff`) is not a blocker. While any time entry has a blocker, the log cannot be submitted; clicking Submit reports the first line that contains one.
_Avoid_: hold, flag, bang, exclamation marker.

**History file**:
A time-log-formatted snapshot of the entries removed from the live log by a single submit. Contains the verbatim prefix of the pre-submit log up to (and including) the start line of the first entry that was not submitted (or the active entry's start, on full success). Non-billable entries inside that prefix are included. Filename is the submit's local time in compact form: `YYYYMMDD-HHMMSS±HHMM.txt`. Written whenever any entry left the live log (including the case where every removed entry was non-billable and nothing was sent).
_Avoid_: backup, archive, snapshot, log file.

**History directory**:
`{appDataDir}/history/`. Contains all history files. Created on app start. Opened by the History button.
_Avoid_: archive, backup folder.

**Notes**:
A free-form scratch area kept alongside the time log, persisted to `notes.txt`. Independent of the time log: notes are never submitted. A line whose first token is a valid ticket ID can be used as a candidate description (e.g. via the selection-driven status hookup); other lines are pure scratch.
_Avoid_: scratchpad, memo, todo list, sidebar.

**Comment**:
The portion of a notes line from the first `#` to the end of the line, inclusive of the `#`. Stripped before a notes line is offered as a candidate description. No equivalent in the time log — there, descriptions are verbatim.
_Avoid_: remark, annotation.

**Extended info**:
The per-time-entry context shown alongside a time entry: ticket info from the external system (when available), plus aggregations across the time log for the same description and same ticket ID. Read-only; never submitted. Additive quantities are shown as a formula in the house standard `current + other = total`, where the current operand is always the one printed nearby (see local, this). A formula collapses to a single value when either operand is zero.
_Avoid_: details, summary, panel.

**Extended-info tooltip**:
The only surface for extended info, opened by clicking a time entry's description line number in the gutter and anchored to that number.
_Avoid_: details panel, info popup, info card, popover.

**Ticket info**:
The external system's snapshot of a ticket ID — title, URL, estimate, and time already logged externally by this worker. Supplied by the active submitter; absent when the submitter has no remote concept (e.g. void) or the ticket ID is not real in the external system.
_Avoid_: Jira card, issue details.

**Logged externally**:
Total time already submitted to the external system against a ticket ID, across all workers. For JiraTempo, the value of Jira's `aggregatetimespent`. Surfaced in extended info as remote.
_Avoid_: Jira time, external time, billed time, my logged time.

**Remote**:
The extended-info name for logged externally — the already-submitted operand in the `Logged: local + remote = total` formula on a ticket's card.
_Avoid_: external, Jira value.

**Local**:
Time in the current time log against a ticket ID that has not been submitted yet: the same-ticket aggregation. The current operand in `Logged: local + remote = total`, and the quantity the `this + rest = total` cards break down (this being the focused time entry's own share, rest the other matching entries).
_Avoid_: unsubmitted, in-log, pending.

**Status line**:
The single-line readout beneath the time log. Its left side shows the current app state — submit progress, submit result, the first parse error, or the total billable across the time log — and its right side shows the week total. A parse error takes over the whole line.
_Avoid_: status bar, footer, toolbar.

**Weekly logged**:
Total time this worker has already submitted to the external system in the current week, across all ticket IDs. Distinct from logged externally, which is per-ticket-ID across all workers. For JiraTempo, the sum of the worker's Tempo worklogs for the week.
_Avoid_: week total, my logged time, logged externally.

**Week total**:
The right side of the status line, shown as `Week: billable + logged = sum`: the current total billable in the time log, plus weekly logged, summing to the week's running total. Collapses to `Week: logged` when there is no billable in the time log. Absent when the active submitter has no weekly concept.
_Avoid_: weekly summary, week progress, capacity bar.
