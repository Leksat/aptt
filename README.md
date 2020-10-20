# A perfect time tracker

It's a desktop app for tracking time and submitting time logs to Jira via Tempo REST API.

In the app the time entries are stored as text. Example:

```
2020-10-20 16:19

2020-10-20 16:20
ABC-123
2020-10-20 16:21
nothing
2020-10-20 16:23
ABC-456 some comment
```

The above means:

- for one minute I did something unknown
- for the next minute I worked on the ticket ABC-123
- for the next two minutes I did nothing (and I mentioned this specifically)
- from 2020-10-20 16:23 and till the current moment I'm working on ABC-456 (and I added some comment)

On Submit:

- ABC-123 will be logged to Jira
- the last entry will stay (and it won't be logged), because it's the active one
- everything else will disappear

There are global hotkeys (see in Settings). The "new entry" one will try to find a ticket number in the clipboard and start a new entry from the current moment.

If the "new entry" hotkey is hit twice in one second, the main window will be shown - to add a description.
