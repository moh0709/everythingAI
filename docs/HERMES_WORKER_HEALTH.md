# Hermes worker health CLI

Use these read-only commands from the repository root:

```sh
npm run hermes:health          # concise operator output
npm run hermes:health -- --json # stable machine-readable snapshot
```

The command reads `.hermes/state.json`, heartbeat, retry and lock files, plus active and retained `events.*.ndjson` history. It never writes, rotates, deletes, or touches runtime files. Queue visibility is obtained with a read-only `gh issue list`; if GitHub is unavailable, `queue.available` is `false` and the count is `null`.

## Status precedence

The first matching row wins:

| Priority | Status | Meaning |
|---:|---|---|
| 1 | `DEGRADED` | Any runtime JSON/history artifact is corrupt, including retry data; partial final history fragments are allowed by the history reader. |
| 2 | `BLOCKED` | Explicit blocked state or terminal retry state. |
| 3 | `UNKNOWN` | No heartbeat exists. |
| 4 | `STALE` | Heartbeat timestamp is invalid or older than 120,000 ms. |
| 5 | `STOPPED` | Fresh heartbeat explicitly reports `STOPPED` or `IDLE`. |
| 6 | `DEGRADED` | Active retry or claim/supervisor lock is present. |
| 7 | `HEALTHY` | Fresh heartbeat and no stronger condition applies. |

Age calculations use one captured/injectable clock, including lock timestamp and file-mtime fallback calculations. Counters are reconstructed from durable event history, including retained rotations, and last-event fields are selected chronologically by event timestamp.

The output intentionally excludes environment values, credentials, webhook bodies, raw corrupt records, and secret-shaped values. A non-healthy status exits with code 1 so operators and automation can distinguish a clean health result from an alert condition.
