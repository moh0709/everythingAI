# EAI-TASK-043: Structured event log and persistent execution history

## Result

**Correction rerun status: PASS — PM QA requirements validated 2026-07-19**

Implementation correction commit: pending metadata finalization.

## Corrections implemented

- `readHistory()` tolerates malformed JSON only in an unterminated final fragment. A malformed final record terminated by `\n` or `\r\n` is surfaced as corruption.
- Corruption errors use physical line numbers and never include record contents or secret values.
- Schema-invalid and unsupported-version records are surfaced, including on the final line.
- Rotation uses a monotonic twelve-digit sequence instead of timestamp/PID/random filename ordering, so same-timestamp rotations retain the newest generations deterministically.
- Added a four-process concurrent-writer test proving 80 complete, unique, parseable records with single-write appends.
- Rename failure aborts before append and leaves the active history unchanged.
- Retention deletion failure is explicit after the active record is safely appended; active and complete rotated records remain readable.
- Added CRLF, physical-line-number, rename-failure, retention-failure, and complete-rotated-record coverage.

## Implementation

- `src/event-history.js` provides passive, version-1 append-only NDJSON history.
- Lifecycle event types remain discovery, claim, start, validation, retry, completion, block, recovery, and shutdown.
- Records require task/issue identity, timestamp, correlation ID, and support result codes, commit SHAs, validation summaries, and sanitized payloads.
- Writes use a single append operation. Size-based rotation retains bounded complete rotated files. `.hermes/history/` remains excluded from Git as runtime data.
- No product application code under `apps/` or `services/` was changed.

## Validation

| Command | Result |
|---|---|
| `node --test tests/event-history.test.mjs` | **PASS — 12/12** |
| `npm test` | **PASS — 111/111** |
| `npm run framework:doctor` | **PASS** |
| `git diff --check` | **PASS** |
| `python3 -m json.tool .hermes/state.json` | **PASS** |
| `python3 -m json.tool docs/HANDOVER_2026-07-15_EAI_TASK_043.json` | **PASS** |

Terminal output is recorded in `LOGS/EAI-TASK-043-terminal.log`.

## Artifacts

- `src/event-history.js`
- `tests/event-history.test.mjs`
- `REPORTS/EAI-TASK-043-STRUCTURED-EVENT-HISTORY.md`
- `docs/HANDOVER_2026-07-15_EAI_TASK_043.json`
- `LOGS/EAI-TASK-043-terminal.log`
- `.hermes/state.json`
