# EAI-TASK-038 — Hermes trigger contract correction

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `968b9ae366b805f2564385536596ff6e1ba84a89`
- **Pre-commit artifact SHA placeholder:** `PENDING_COMMIT_SHA`
- **Artifact commit SHA:** `recorded after commit`
- **Final SHA source of truth:** `GitHub issue comment after push`

## Files changed

- `docs/HERMES_OPERATING_MANUAL_RC1.md`
- `scripts/webhook-event-dispatcher.mjs`
- `scripts/task-poller.mjs`
- `tests/webhook-event-dispatcher.test.mjs`
- `tests/task-poller-watch-loop.test.mjs`
- `package.json`
- `.hermes/state.json`

## Validation summary

- Dry run: N/A
- Framework doctor: PASS (`node scripts/framework-doctor.mjs`)
- Trigger-contract tests: PASS (`node --test tests/*.test.mjs`)
- Git diff check: PASS (`git diff --check`)
- JSON handover parse: pending until handover file is written

## Lifecycle notes

- Issue comment: claim comment posted before implementation; final completion comment pending
- Labels updated: `hermes:ready` -> `hermes:working` for claim; final labels pending review-state update
- Final SHA handling: claim phase recorded `PENDING_COMMIT_SHA` style placeholders until the pushed commit SHA is known, then the report/handover/state/comment should be synchronized to the same final artifact SHA

## Trigger contract work

Implemented a narrow webhook-event dispatcher helper that:

- prefers `GITHUB_EVENT_PATH`;
- falls back to `--event-path <file>`;
- only reads STDIN when `--stdin-json` is explicitly set;
- returns machine-readable outcomes for missing payloads, malformed JSON, ignored events, ineligible issues, claim conflicts, and execution eligibility;
- revalidates eligible issues against live queue state before returning `EXECUTE`.

## Queue-return evidence

- Added `watchLoop()` export in `scripts/task-poller.mjs`.
- Added deterministic test coverage proving the poll loop continues across multiple iterations after a poll cycle completes.

## Skipped commands / reasons

- UI/API suites were not run because this task changed only the Hermes operating manual, a narrow webhook contract helper, the poller control loop, and focused tests.
- The new tests cover the trigger contract and queue-return behavior directly.

## Follow-up

- PM review

## Commit SHA rule

The report, GitHub issue comment, and state file must describe the same artifact commit SHA even when the workflow uses a follow-up metadata commit.

- Before the artifact commit exists, `PENDING_COMMIT_SHA` is acceptable only as a temporary placeholder.
- After the artifact commit exists, update the final issue comment, report, and `.hermes/state.json` so they all reference the real artifact SHA.
- If a follow-up metadata sync commit is used, the report must explicitly state that the GitHub issue comment is the source of truth for the artifact commit SHA and that the metadata commit is a separate synchronization step.
