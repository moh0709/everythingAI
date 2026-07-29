# EAI-TASK-046A: Queue Ownership Fence

Issue: #85
Status: BLOCKED
Date: 2026-07-29

## Summary

Forge fenced the checked-in Atlas queue path and added automated tests for Forge, Hermes, and Atlas queue eligibility. The live competing Atlas process was identified and stopped. The required disposable Hermes drill did not complete because no unattended Hermes worker discovered issue #86 during the bounded observation window.

## Root Cause

The unauthorized #84 claim came from an active local process, not from the checked-in Python cron script:

- Process: `node.exe`
- PID: `6936`
- Command line: `C:/nvm/v22.15.0/node.exe scripts/atlas-poller.mjs`
- Created: 2026-07-24 09:13:49 local time
- Checked-in script inventory: only `scripts/atlas-cron-poller.py`; `scripts/atlas-poller.mjs` is not tracked and was not present in `scripts/`.
- #84 claim comment identity: `Atlas (poller)` at 2026-07-29T07:02:09Z.

## Remediation Applied

- Added shared agent queue policy in `src/agent-queue-policy.js`.
- Wired Forge eligibility through the shared policy.
- Wired Hermes claim readiness through the shared policy.
- Fenced `scripts/atlas-cron-poller.py` to query only `pm:ready + atlas:ready + pm:approved-delegation`.
- Added an Atlas body-contract gate requiring parent Forge issue, starting SHA, final SHA or pending, allowed files, forbidden files, validation commands, and reporting destination.
- Added regression coverage for Forge, Hermes, Atlas rejection, and explicit Atlas delegation eligibility.
- Fixed Forge default state-path behavior so tests and callers using a supplied `repoRoot` do not write state into the wrong workspace.

## Runtime Evidence

Process and scheduler inspection after remediation:

- Atlas process `PID 6936` stopped with `Stop-Process -Id 6936 -Force`.
- Five-second recheck found no `atlas-poller` or `atlas-cron` process other than the inspection command itself.
- Scheduled task query found only `EverythingAI Forge Trigger` in running state.
- Open `pm:ready + hermes:ready` queue before disposable issue creation: empty.
- Open `pm:ready + atlas:ready` queue after Atlas fence: empty.
- Local Hermes claim lock: absent.
- Local Forge state restored to issue #85 after regression-test pollution was detected and fixed.

## Disposable Hermes Drill

- Disposable issue: #86
- Created: 2026-07-29T07:42:17Z
- Initial labels: `pm:ready + hermes:ready`
- Observation window: approximately six minutes, polling every 20 seconds
- Observed result: issue remained `pm:ready + hermes:ready` with zero comments throughout the window
- Claim identity: none observed
- Completion comment: none observed
- Final action: moved #86 out of runnable queue with `hermes:blocked + pm:review`; left open because completion evidence was not collected
- Duplicate execution: none observed
- Unauthorized Atlas claim after fence: none observed

## Validation

- `node --test tests/agent-queue-policy.test.mjs`: 5/5 pass after RED failure on missing policy and missing Atlas fence
- `node --test tests/forge-trigger.test.mjs --test-name-pattern "default Forge state path follows"`: pass after RED failure
- `node --test tests/forge-trigger.test.mjs`: 11/11 pass
- `node --test tests/task-claim.test.mjs`: 8/8 pass
- `node --test tests/task-poller-runtime-mode.test.mjs tests/task-worker-runtime-mode.test.mjs`: 5/5 pass
- `npm run framework:doctor`: PASS
- `npm test`: 163/163 pass
- `node --test tests/*.test.mjs`: 163/163 pass
- `git diff --check`: exit 0; line-ending warnings only
- `python -m json.tool .hermes/forge/context-85.json`: PASS

## Blocker

The required success condition cannot be met because no unattended Hermes worker discovered and completed disposable issue #86. Remediation is to restore or start exactly one authorized Hermes poller for `pm:ready + hermes:ready`, then rerun a new disposable no-op drill and prove exactly-one claim and completion.
