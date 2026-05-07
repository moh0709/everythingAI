# Phase 3 — Planning Session Foundation Plan

## Status

```text
PLANNED
PENDING IMPLEMENTATION
```

## Objective

Introduce a formal planning-session foundation for EverythingAI so file organization becomes explicitly user-controlled, grouped, auditable, reviewable, and ready for future planning snapshots and execution batches.

Phase 3 builds on:

```text
Phase 1 — ingestion/planning separation
Phase 2 — job orchestration foundation
```

---

# Phase 3 Scope

Phase 3 focuses on:

```text
- planning session model
- planning session service boundary
- suggestion grouping by session
- explicit planning run flow
- planning snapshot groundwork
- preserving current suggestion compatibility
- planning lifecycle foundation
```

---

# Phase 3 Non-Goals

Phase 3 should NOT fully implement:

```text
- advanced execution jobs
- full rollback UI
- external queue infrastructure
- full frontend redesign
- full semantic planning engine
- multi-user/tenant permissions
```

---

# Permanent Rules Applied in Phase 3

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Planning creates suggestions.
Suggestions become previews.
Previews require approval before execution.
```

```text
Watcher must not create planning sessions automatically.
```

---

# Phase 3 Step Breakdown

## Step 3.1 — Audit Current Planning Runtime

### Objective

Audit current planning-related runtime code before schema/service changes.

### Files to inspect

```text
services/api/src/suggestions/suggestionService.js
services/api/src/integrations/organizor/organizationRules.js
services/api/src/routes/actions.routes.js
services/api/src/previews/actionPreviewService.js
services/api/src/actions/actionExecutor.js
services/api/src/automation/localPipeline.js
services/api/src/db/schema.sql
services/api/src/db/client.js
services/api/test/localMvp.test.js
services/api/test/jobs.test.js
```

### Deliverables

```text
- current suggestion flow map
- current preview/execution dependency map
- current DB relationship map
- compatibility risks
- session schema recommendations
```

### Runtime changes

```text
None
```

---

## Step 3.2 — Define Minimal Planning Session Contract

### Objective

Define a minimal planning session contract suitable for MVP runtime implementation.

### Candidate fields

```text
id
status
mode
source
settings_json
summary_json
created_at
updated_at
completed_at
```

### Runtime changes

Documentation or constants only.

---

## Step 3.3 — Add Planning Session Schema

### Objective

Add safe database support for planning sessions.

### Candidate schema additions

```text
planning_sessions
planning_snapshots optional/minimal
organization_suggestions.planning_session_id nullable
```

### Compatibility rule

Existing suggestions must continue working even if `planning_session_id` is null.

---

## Step 3.4 — Add Planning Session Repository Helpers

### Objective

Add DB helpers for creating, updating, listing, and reading planning sessions.

### Files likely affected

```text
services/api/src/db/client.js
```

Risk:

```text
MEDIUM
```

because `db/client.js` is currently large and shared.

---

## Step 3.5 — Add Planning Service Boundary

### Objective

Introduce a planning service that owns explicit planning runs.

### Target future file

```text
services/api/src/planning/planningSessionService.js
```

### Responsibilities

```text
- create planning session
- run planning for selected files
- link suggestions to session
- update session summary/status
```

---

## Step 3.6 — Add Planning Routes

### Objective

Expose explicit planning session endpoints.

### Target endpoints

```text
POST /api/planning/sessions
GET /api/planning/sessions
GET /api/planning/sessions/:sessionId
POST /api/planning/sessions/:sessionId/run
```

### Compatibility rule

Existing suggestion/action routes must keep working.

---

## Step 3.7 — Update Suggestion Generation to Support Optional Session ID

### Objective

Allow generated suggestions to be associated with a planning session while preserving direct suggestion generation.

### Compatibility rule

If no session ID is supplied, current behavior remains valid.

---

## Step 3.8 — Add Regression Tests

### Objective

Protect planning-session behavior.

Tests should verify:

```text
- planning session can be created
- running a session generates suggestions
- suggestions are linked to session
- direct suggestion generation still works
- watcher/ingestion do not create planning sessions
- previews/execution still work from session-linked suggestions
```

---

## Step 3.9 — Runtime Verification

### Objective

Verify Phase 3 runtime integration and compatibility.

Required local/CI command:

```bash
cd services/api
npm test
```

---

## Step 3.10 — Completion Due Diligence

### Objective

Close Phase 3 and verify readiness for Phase 4.

Deliverable:

```text
docs/PHASE3_COMPLETION_DUE_DILIGENCE.md
```

---

# Proposed Implementation Order

```text
1. Step 3.1 Audit current planning runtime
2. Step 3.2 Define minimal planning session contract
3. Step 3.3 Add planning session schema
4. Step 3.4 Add repository helpers
5. Step 3.5 Add planning service boundary
6. Step 3.6 Add planning routes
7. Step 3.7 Link suggestions to optional session ID
8. Step 3.8 Add regression tests
9. Step 3.9 Runtime verification
10. Step 3.10 Completion due diligence
```

---

# Phase 3 Due Diligence

## Architecture consistency

```text
PASS
```

The plan follows Phase 0, Phase 1, and Phase 2 boundaries.

## Runtime safety

```text
PASS WITH MEDIUM RISK
```

The main risks are schema migration and preserving existing suggestion/preview behavior.

## Filesystem safety

```text
PASS
```

Phase 3 does not modify execution behavior.

## Recommendation

```text
Begin Step 3.1 audit before runtime changes.
```
