# Phase 3 — Step 3.9 Runtime Verification

## Status

```text
COMPLETE
```

## Objective

Verify Phase 3 planning-session runtime integration by reviewing schema, runtime migrations, repository helpers, planning service, planning routes, session-aware suggestions, and regression coverage.

---

# Verification Scope

Runtime files reviewed:

```text
services/api/src/db/schema.sql
services/api/src/db/client.js
services/api/src/planning/planningSessionService.js
services/api/src/routes/planning.routes.js
services/api/src/routes/actions.routes.js
services/api/src/routes/server.js
services/api/src/suggestions/suggestionService.js
services/api/src/previews/actionPreviewService.js
services/api/src/actions/actionExecutor.js
services/api/test/planningSessions.test.js
services/api/test/localMvp.test.js
services/api/test/jobs.test.js
```

---

# Verification Method

## Code-level verification

```text
DONE
```

## Test-suite consistency verification

```text
DONE
```

## Actual npm test execution

```text
NOT EXECUTED IN THIS TOOL CONTEXT
```

Reason:

```text
The GitHub connector allows repository file inspection and mutation but does not provide a local npm runtime shell.
```

Required local command:

```bash
cd services/api
npm test
```

---

# Verification Result 1 — Schema Support

## Expected

The schema should include:

```text
planning_sessions
organization_suggestions.planning_session_id
```

## Verified

```text
PASS
```

Fresh databases now receive planning-session support directly from `schema.sql`.

---

# Verification Result 2 — Existing Database Migration

## Expected

Existing SQLite databases should be upgraded safely.

## Verified

```text
PASS
```

`openDatabase()` runs `ensurePlanningSessionSchema()` after loading `schema.sql`.

This ensures existing `organization_suggestions` tables receive:

```text
planning_session_id
```

if missing.

---

# Verification Result 3 — DB Client Integrity

## Expected

The DB client should preserve all existing helper exports while adding planning-session helpers.

## Verified

```text
PASS
```

An earlier truncation issue was detected during due diligence and corrected.

The file now contains:

```text
- original indexing helpers
- original extraction helpers
- original search helpers
- original suggestion helpers
- original preview/execution helpers
- original audit helpers
- original insight/embedding/status helpers
- new planning-session helpers
```

---

# Verification Result 4 — Planning Session Repository Helpers

## Expected

The DB layer should support:

```text
insertPlanningSession()
updatePlanningSession()
getPlanningSessionById()
listPlanningSessions()
```

## Verified

```text
PASS
```

Repository helpers exist and parse JSON fields into runtime objects.

---

# Verification Result 5 — Planning Service Boundary

## Expected

Planning orchestration should be centralized in:

```text
services/api/src/planning/planningSessionService.js
```

## Verified

```text
PASS
```

The planning service owns:

```text
createPlanningSession()
getPlanningSession()
getPlanningSessionWithSuggestions()
listPlanningSessionRecords()
runPlanningSession()
```

---

# Verification Result 6 — Planning Session Lifecycle

## Expected

Planning sessions should support:

```text
draft → running → ready
failed when errors occur
```

## Verified

```text
PASS
```

`runPlanningSession()` marks sessions running, then ready or failed.

---

# Verification Result 7 — Planning Routes

## Expected

The API should expose:

```text
POST /api/planning/sessions
GET /api/planning/sessions
GET /api/planning/sessions/:sessionId
POST /api/planning/sessions/:sessionId/run
```

## Verified

```text
PASS
```

The planning router exists and delegates to the planning service.

---

# Verification Result 8 — Server Registration

## Expected

Planning routes should be registered under the authenticated `/api` scope.

## Verified

```text
PASS
```

`server.js` imports and registers `createPlanningRouter()` with `requireApiToken`.

---

# Verification Result 9 — Session-Aware Suggestions

## Expected

`generatePreviewSuggestions()` should support:

```text
legacy/global suggestions
session-owned suggestions
```

## Verified

```text
PASS
```

The function accepts optional:

```text
planningSessionId
```

and stores it as:

```text
planning_session_id
```

---

# Verification Result 10 — Session-Aware Dedupe

## Expected

Legacy/global suggestions should not block session-owned suggestions.

Session-owned suggestions should dedupe only within the same planning session.

## Verified

```text
PASS
```

Dedupe now respects session ownership.

---

# Verification Result 11 — Preview/Execution Compatibility

## Expected

Existing preview and execution flows should continue to work from suggestion IDs.

## Verified

```text
PASS
```

No execution or preview logic had to be redesigned.

The regression tests cover preview/execution from session-linked suggestions.

---

# Verification Result 12 — Watcher/Ingestion Separation

## Expected

Watcher and ingestion flows must not create planning sessions automatically.

## Verified

```text
PASS
```

No watcher or ingestion route creates planning sessions.

Planning remains explicit.

---

# Known Pending Verification

Actual test execution must still run locally or in CI:

```bash
cd services/api
npm test
```

This is an operational verification item, not an architectural blocker.

---

# Runtime Risk Assessment

## Current risk

```text
MEDIUM
```

Reason:

```text
- schema changed
- runtime migration added
- core suggestion generation changed
- planning routes added
- planning service added
```

Mitigations:

```text
- nullable session ownership
- route compatibility preserved
- execution untouched
- watcher untouched
- regression tests added
```

---

# Step 3.9 Due Diligence

## Architecture consistency

```text
PASS
```

## Migration safety

```text
PASS
```

## Planning lifecycle

```text
PASS
```

## Suggestion ownership

```text
PASS
```

## Preview/execution compatibility

```text
PASS
```

## Actual npm test execution

```text
PENDING LOCAL/CI EXECUTION
```

---

# Result

```text
Step 3.9 passes code-level due diligence.
```

The project can proceed to:

```text
Step 3.10 — Phase 3 Completion Due Diligence
```
