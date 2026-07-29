# EAI-TASK-047 Hermes 24-hour Soak

Issue: #92
Agent: Forge
Status: BLOCKED
Artifact commit: a970335

## Result

The required 24-hour continuous Hermes reliability soak was not completed in this bounded Forge worker session. The observed window began when the released execution context was created and ended after repository and live service spot checks:

- Observation start: 2026-07-29T10:41:12.279Z
- Observation end: 2026-07-29T10:43:48.722Z
- Duration: PT2M36.443S
- Required duration: PT24H

This is a truthful blocker. No success is claimed for the soak acceptance criteria.

## Finalization Race Inspection

Issue #69 contains a confirmed stale finalization sequence:

- 2026-07-29T10:02:30Z: Forge posted substantive PASS evidence for EAI-TASK-046.
- 2026-07-29T10:08:17Z: a later outer execution wrapper posted a TIMEOUT/BLOCKED result.
- 2026-07-29T10:40:18Z: PM accepted the substantive evidence and identified the later TIMEOUT as an outer wrapper finalization race.

Root cause in `src/forge-trigger.js`: after an autonomous execution returned a non-ok result, the trigger unconditionally transitioned the issue to `forge:blocked + pm:review` without first re-reading live labels to detect that the worker had already submitted `forge:done + pm:review`.

Fix implemented:

- Added a live verified submission guard before blocked finalization.
- Added regression coverage proving a stale autonomous TIMEOUT does not downgrade an already submitted Forge task.

## Acceptance Matrix

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| AC-1 | At least 24 continuous hours are evidenced | BLOCKED | Only PT2M36.443S observed in this worker |
| AC-2 | Service remains bounded and recoverable | BLOCKED | Spot service evidence only; no 24-hour continuity |
| AC-3 | No duplicate execution or restart storm | BLOCKED | Not provable without the required soak window |
| AC-4 | Queue ownership remains unambiguous | BLOCKED | Not provable without the required soak window |
| AC-5 | Successful completion cannot be downgraded by stale timeout/finalization | PASS | Regression test added and passing |
| AC-6 | No secrets appear in artifacts/comments | PASS | Artifacts contain sanitized labels, timestamps, and command summaries only |
| AC-7 | Submit `forge:done + pm:review` on success or `forge:blocked + pm:review` on blocker | PENDING LIVE TRANSITION | To be verified after push and issue label update |
| AC-8 | Do not self-close | PASS | Issue remains open |

## Validation

- `npm run framework:doctor`: PASS.
- `node --test tests/*.test.mjs`: PASS, 165/165.
- `npm test`: PASS, 165/165.
- Targeted regression red/green:
  - Before fix, `node --test tests/forge-trigger.test.mjs` failed on `stale autonomous timeout does not downgrade already submitted Forge evidence`.
  - After fix, `node --test tests/forge-trigger.test.mjs` passed, 12/12.
- Health CLI JSON validation: `node scripts/hermes-health.mjs --json` emitted parseable JSON; local status was UNKNOWN because this Windows checkout has no local Hermes runtime artifacts.
- History parser validation: import of `src/event-history.js` passed.
- systemd/service spot evidence through SSH: host `vmi2938167`; `hermes-runtime.target`, `hermes-poller.service`, and `hermes-watchdog.timer` active; `hermes-watchdog.service` inactive; poller `NRestarts=0`.
- `git diff --check`: PASS with CRLF normalization warnings only.
- JSON parsing: handover and state JSON validated before submission.

## Blocker

The issue explicitly requires at least 24 continuous hours of evidenced observation. This Forge worker started from context created at 2026-07-29T10:41:12.279Z and cannot truthfully evidence a 24-hour window. Submitting PASS would violate the acceptance criteria.

## Remediation

Run a dedicated 24-hour observer from the live Hermes host or another durable runner, recording start/end timestamps, heartbeat continuity, queue lifecycle, recovery/watchdog evidence, restart counts, ownership checks, and sanitized terminal logs. The finalization race fix from this submission should remain in place for the next run.
