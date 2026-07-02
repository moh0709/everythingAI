# EAI-TASK-036: Add explicit server wiring gate for production workspace context helper

## Final status
PASS

## Summary
Added a small, explicit API server wiring gate that only enables the guarded production workspace-context middleware when `productionWorkspaceResolution` is provided. Default local startup still uses the read-only workspace context path and does not require PostgreSQL.

## Files changed
- `services/api/src/server.js`
- `services/api/test/serverWorkspaceContextGate.test.js`

## Behavior added
- Default server/app creation does not invoke production workspace middleware wiring.
- Explicit `productionWorkspaceResolution` options are passed through the server gate.
- The existing guarded production helper remains the only production persistence entry point.
- Default startup behavior remains read-only and SQLite-safe.

## Validation
- `git pull --ff-only` — PASS
- `node scripts/framework-doctor.mjs` — PASS
- `cd apps/everything-ai-ui && npm run typecheck` — PASS
- `cd apps/everything-ai-ui && npm run build` — PASS
- `cd services/api && npm test` — PASS
- Focused test slice for the new gate and workspace middleware — PASS

## Proof points
- Default app creation did not invoke the production middleware factory.
- Explicit production resolution options were forwarded unchanged into the production helper factory.
- No real PostgreSQL server was required.
- No automatic migration behavior was introduced.

## Risks and rollback note
- Rollback is straightforward: revert the `server.js` gating refactor and the new server gate test file.
- The change is narrow and isolated to server composition.

## Artifacts
- Log: `LOGS/EAI-TASK-036-terminal.log`
- Handover: `docs/HANDOVER_2026-07-01_POST_EAI_TASK_036.json`

## Commit metadata
- Artifact commit SHA: PENDING_COMMIT_SHA
- Final pushed commit SHA: PENDING_COMMIT_SHA
