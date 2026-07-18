# EAI-TASK-039 — Harden atomic task claiming and duplicate-dispatch prevention

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `8fef06c324fba90ec876784d23c8566c80f74a97`
- **Pre-commit artifact SHA placeholder:** `PENDING_COMMIT_SHA`
- **Artifact commit SHA:** `PENDING_COMMIT_SHA`
- **Final SHA source of truth:** `GitHub issue comment after final push`

## Files changed

- `scripts/task-worker.mjs`
- `scripts/webhook-event-dispatcher.mjs`
- `tests/task-worker-runtime-mode.test.mjs`
- `tests/webhook-event-dispatcher.test.mjs`
- `docs/HERMES_OPERATING_MANUAL_RC1.md`
- `.hermes/state.json`
- `REPORTS/EAI-TASK-039-ATOMIC-CLAIM-HARDENING.md`
- `docs/HANDOVER_2026-07-14_EAI_TASK_039.json`
- `LOGS/EAI-TASK-039-terminal.log`

## Validation summary

- `node scripts/framework-doctor.mjs` — PASS
- `node --test tests/task-claim.test.mjs tests/task-worker-runtime-mode.test.mjs tests/webhook-event-dispatcher.test.mjs tests/task-poller-watch-loop.test.mjs` — PASS
- `node --test tests/*.test.mjs` — PASS
- `npm test` — PASS
- `git diff --check` — PASS
- `python3 -m json.tool docs/HANDOVER_2026-07-14_EAI_TASK_039.json` — PASS

## Lifecycle notes

- Issue #61 was claimed with `hermes:working` and `hermes:ready` removed.
- The claim acknowledgement comment was posted before implementation.
- `.hermes/state.json` was updated because it exists in this checkout.

## Scope summary

Implemented the claim-hardening follow-up by:

- fixing the polling worker so it explicitly injects `stateReader` and can execute claimed work without a `ReferenceError`;
- adding a shared `executeClaimedTask()` helper so webhook and polling paths can hand off the same ownership context;
- having the webhook entry path claim once, then execute using the returned claim handle instead of returning a bare eligibility decision;
- expanding deterministic tests for production webhook handoff, repeated delivery, and concurrent delivery behavior;
- updating the operating manual to document the claim handoff and duplicate-delivery behavior.

## Known limitations

- The repository still relies on the GitHub issue queue plus `.hermes/state.json` rather than a separate hidden queue service, and state writes are skipped if the file is absent.
- Direct calls to the classification helper remain eligibility-only; production webhook execution uses `runWebhookEntry()`.
- The local claim lock remains conservative and only clears stale same-host locks with dead PIDs.

## Follow-up

- Finalize the metadata sync commit, push, and post the closing issue comment with the artifact SHA and final pushed SHA.

## Commit SHA rule

The report, GitHub issue comment, and state file must describe the same artifact commit SHA even when the workflow uses a follow-up metadata commit.

- Before the artifact commit exists, `PENDING_COMMIT_SHA` is acceptable only as a temporary placeholder.
- After the artifact commit exists, update the final issue comment, report, and `.hermes/state.json` so they all reference the real artifact SHA.
- If a follow-up metadata sync commit is used, the report must explicitly state that the GitHub issue comment is the source of truth for the artifact commit SHA and that the metadata commit is a separate synchronization step.
