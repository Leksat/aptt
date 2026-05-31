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
A line of the form `YYYY-MM-DD HH:MM`. Marks a wall-clock moment. Anchors the beginning of one time entry and the end of the previous one. A trailing start (last line of the log, no description below) closes the previous time entry without opening a new one.
_Avoid_: marker, boundary, header, timestamp.

**Time entry description**:
The body of a time entry — everything between its start and the next start. Its first token is tested as a target ID; if the active submitter accepts it, the entry is billable. Otherwise the description is just there to carve time out of the log (e.g. `nothing`, empty).
_Avoid_: body, content, text, note.

**Target ID**:
The identifier of the external thing time is being logged against (e.g. `ABC-123` for a Jira issue). The active submitter decides what counts as a valid target ID — the Jira submitter accepts issue keys, a Toggl submitter would accept project identifiers, etc. Lives as the first token of a time entry description.
_Avoid_: ticket ID, issue key, target, reference, subject.

**Active time entry**:
The trailing time entry when the log ends with a description line. Its end is "now" and it is never submitted. If the log ends with a time entry start instead, there is no active time entry — all entries are closed, and on submit the entire log is emptied.
_Avoid_: current entry, in-progress entry, open entry.

**Billable**:
A time entry whose description begins with a valid target ID for the active submitter. Only closed billable entries are submitted; non-billable closed entries are removed without being sent. The active entry can also be billable; its running duration counts toward live totals even though it is never submitted.
_Avoid_: loggable, sendable.
