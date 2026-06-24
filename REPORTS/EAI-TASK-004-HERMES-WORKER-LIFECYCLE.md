# EAI-TASK-004 — Implement Hermes worker lifecycle claim/report/state flow

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `25c4c688f0e488789852155f033f4d0d94b198a8`
- **Final commit SHA:** `PENDING_COMMIT_SHA`

## Files changed

- `scripts/task-worker.mjs`
- `scripts/task-poller.mjs`
- `src/task-queue.js`
- `templates/REPORT_TEMPLATE.md`
- `.hermes/state.json`
- `LOGS/EAI-TASK-004-terminal.log`
- `REPORTS/EAI-TASK-004-HERMES-WORKER-LIFECYCLE.md`

## Validation summary

- Dry run: PASS
- Framework doctor: PASS
- UI typecheck: PASS
- UI build: PASS
- API tests: PASS

## Lifecycle notes

- `npm run worker:once -- --dry-run` now identifies the next runnable issue and reports the report/log paths without mutating GitHub labels or `.hermes/state.json`.
- `scripts/task-worker.mjs` now supports dry-run selection, safe claim/update flow, artifact creation, issue commenting, and label transitions for one issue at a time.
- `scripts/task-poller.mjs` now dispatches the worker during watch mode instead of only listing issues.
- `src/task-queue.js` now centralizes runnable-issue filtering, task IDs, artifact paths, and state helpers.
- `templates/REPORT_TEMPLATE.md` now includes dry-run and lifecycle metadata placeholders.

## Skipped commands / reasons

- None.

## Follow-up

- PM review should confirm the lifecycle behavior and decide whether the next iteration should turn the placeholder final-SHA pattern into a stricter post-commit synchronization flow.

## Commit SHA rule

The report, GitHub issue comment, and state file must converge on the same final commit SHA.

- Before the commit that produces the artifact SHA is known, it is acceptable to use `PENDING_COMMIT_SHA` as a temporary placeholder.
- After the commit exists, update the final issue comment, report, and `.hermes/state.json` so they all reference the real final SHA.
- If the workflow cannot update all three artifacts atomically, the report must explicitly describe the two-step finalization pattern that was used.
