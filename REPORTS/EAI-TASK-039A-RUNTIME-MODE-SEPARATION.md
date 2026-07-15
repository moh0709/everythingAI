# EAI-TASK-039A — Separate polling and webhook runtime entry paths

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `1d456883fb8469fbba059a23df95c892594970f7`
- **Artifact commit SHA:** `3d2d1c1`
- **Final SHA source of truth:** `GitHub issue comment after push`

## Files changed

- `.hermes/state.json`
- `docs/HERMES_OPERATING_MANUAL_RC1.md`
- `package.json`
- `scripts/task-poller.mjs`
- `scripts/task-worker.mjs`
- `scripts/webhook-event-dispatcher.mjs`
- `src/runtime-mode.js`
- `tests/runtime-mode.test.mjs`
- `tests/task-poller-runtime-mode.test.mjs`
- `tests/task-worker-runtime-mode.test.mjs`
- `tests/webhook-event-dispatcher.test.mjs`
- `REPORTS/EAI-TASK-039A-RUNTIME-MODE-SEPARATION.md`
- `docs/HANDOVER_2026-07-15_EAI_TASK_039A.json`
- `LOGS/EAI-TASK-039A-terminal.log`

## Validation summary

- Framework doctor: PASS (`node scripts/framework-doctor.mjs`)
- Unit tests: PASS (`node --test tests/*.test.mjs`)
- npm test: PASS (`npm test`)
- Git diff check: PASS (`git diff --check`)
- JSON handover parse: PASS (`python3 -m json.tool docs/HANDOVER_2026-07-15_EAI_TASK_039A.json`)

## Runtime-mode work

Implemented an explicit runtime-mode detector and wired it into the actual polling and webhook entry paths:

- `src/runtime-mode.js` returns machine-readable `POLLING`, `WEBHOOK`, or `UNKNOWN` results.
- `scripts/task-poller.mjs` now requires polling mode before queue work.
- `scripts/task-worker.mjs` now refuses to mutate GitHub unless polling mode is explicit.
- `scripts/webhook-event-dispatcher.mjs` now requires webhook mode before payload discovery.
- `package.json` scripts now launch polling and webhook paths with explicit `--mode` values.

## Queue and gateway behavior

- Polling mode never calls webhook discovery.
- Webhook mode only discovers payloads after explicit webhook selection.
- Unknown mode returns a machine-readable error and performs no queue mutation.
- The Telegram/chat gateway remains non-task-execution context.

## Skipped commands / reasons

- None.

## Follow-up

- PM review

## Commit SHA rule

The report, GitHub issue comment, and state file must describe the same final workflow state even when the workflow uses a follow-up metadata sync commit.

- The code change commit is `3d2d1c1`.
- The final pushed SHA will be recorded in the GitHub issue comment after the metadata sync push.
- The report intentionally treats the issue comment as the source of truth for the final pushed SHA to avoid circular self-reference.
