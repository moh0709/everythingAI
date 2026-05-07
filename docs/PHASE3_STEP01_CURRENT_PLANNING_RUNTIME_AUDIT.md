# Phase 3 — Step 3.1 Current Planning Runtime Audit

## Status

```text
COMPLETE
```

## Objective

Audit the current planning-related runtime before introducing planning sessions, schema changes, or planning service boundaries.

This step is audit-only and does not modify runtime behavior.

---

# Files Audited

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

---

# Current Planning Entry Points

## Explicit API route

Current route:

```text
POST /api/suggestions
```

Current flow:

```text
actions.routes.js
  ↓
generatePreviewSuggestions(db, { fileId })
  ↓
analyzeFileForOrganization(file)
  ↓
insertOrganizationSuggestion()
```

This is already explicit/user-triggered.

---

## Programmatic planning pipeline

Current function:

```text
runPlanningPipeline(db, { limit })
```

Current flow:

```text
listIndexedFiles()
  ↓
generatePreviewSuggestions() per file
```

This is separate from knowledge ingestion after Phase 1.

---

# Current Suggestion Model

Current table:

```text
organization_suggestions
```

Current fields:

```text
id
file_id
action_type
current_value
suggested_value
reason
confidence
risk_level
requires_approval
created_at
```

Current limitation:

```text
No planning_session_id exists.
```

---

# Current Suggestion Generation Behavior

`generatePreviewSuggestions()` currently:

```text
1. loads indexed file by fileId
2. analyzes file metadata/content
3. creates category/tag/move suggestions
4. optionally creates rename suggestion
5. deduplicates against existing suggestions for same file/action/value
6. inserts new suggestions
7. returns saved + existing suggestions
```

Important:

```text
Existing dedupe key is action_type + suggested_value.
```

Future planning sessions must avoid accidentally blocking new session-owned suggestions because an older global suggestion exists.

---

# Current Preview Dependency

Current preview creation:

```text
createActionPreview(db, { suggestionId })
```

Preview depends on:

```text
suggestionId
```

not on any session.

This is good.

It means adding planning sessions can be compatible if:

```text
organization_suggestions.planning_session_id is nullable
```

---

# Current Execution Dependency

Current execution flow:

```text
executeActionPreview(db, { previewId, approve })
```

Execution depends on:

```text
previewId
```

not on suggestion session data.

This is good.

Planning session introduction should not require execution changes in early Phase 3.

---

# Current Safety Model

Planning currently creates suggestions only.

Suggestions do not execute filesystem actions.

Execution still requires:

```text
preview
approval
executeActionPreview(... approve: true)
```

This remains compatible with Phase 3.

---

# Current Compatibility Risks

## Risk 1 — Suggestion deduplication across sessions

Current dedupe checks existing suggestions by:

```text
action_type + suggested_value
```

for the file.

If planning sessions are introduced, this behavior may prevent a new session from receiving its own suggestions if identical suggestions already exist globally.

Recommended Phase 3 approach:

```text
- preserve current behavior for non-session suggestions
- for session-owned suggestions, dedupe within the same session only
```

---

## Risk 2 — Existing routes expect flat suggestions

Existing routes currently return:

```text
{ suggestions }
```

Recommended Phase 3 approach:

```text
keep existing /api/suggestions route unchanged
add new /api/planning/sessions routes
```

---

## Risk 3 — db/client.js is large and shared

Adding repository helpers to `db/client.js` is practical for MVP but increases file size.

Recommended Phase 3 approach:

```text
add minimal helpers now
split repositories in a later refactor
```

---

## Risk 4 — Schema migration safety

Adding a nullable column is safer than forcing migration.

Recommended Phase 3 schema strategy:

```text
CREATE TABLE IF NOT EXISTS planning_sessions
ALTER TABLE organization_suggestions ADD COLUMN planning_session_id TEXT if missing
```

However, because SQLite does not support `ADD COLUMN IF NOT EXISTS` consistently across all versions, migration logic may need to live in `openDatabase()` or a helper.

Alternative simpler MVP approach:

```text
include column in schema.sql for fresh DB
add runtime migration helper for existing DB
```

---

# Recommended Minimal Planning Session Model

Recommended table:

```text
planning_sessions
```

Recommended fields:

```text
id
status
mode
source
settings_json
summary_json
error_message
created_at
updated_at
completed_at
```

Recommended statuses:

```text
draft
running
ready
failed
archived
```

Recommended mode values:

```text
deterministic
provider
hybrid
```

Phase 3 should start with:

```text
deterministic
```

---

# Recommended Planning Service Boundary

Recommended future file:

```text
services/api/src/planning/planningSessionService.js
```

Responsibilities:

```text
createPlanningSession()
runPlanningSession()
getPlanningSession()
listPlanningSessions()
```

`runPlanningSession()` should:

```text
1. mark session running
2. list selected/indexed files
3. call generatePreviewSuggestions(db, { fileId, planningSessionId })
4. update session summary/status
5. return session + suggestions
```

---

# Recommended Route Strategy

Add new routes:

```text
POST /api/planning/sessions
GET /api/planning/sessions
GET /api/planning/sessions/:sessionId
POST /api/planning/sessions/:sessionId/run
```

Do not remove existing routes:

```text
POST /api/suggestions
GET /api/suggestions
POST /api/action-previews
POST /api/action-executions
```

---

# Recommended Suggestion Compatibility Strategy

Update suggestion generation to accept optional:

```text
planningSessionId
```

If provided:

```text
insert suggestions with planning_session_id
list/dedupe against same file and same session
```

If not provided:

```text
preserve existing behavior
```

---

# Step 3.1 Due Diligence

## Architecture consistency

```text
PASS
```

The current planning runtime is compatible with session introduction.

## Compatibility safety

```text
PASS
```

Nullable session linking can preserve existing suggestion/preview/execution flows.

## Execution safety

```text
PASS
```

Phase 3 can introduce sessions without changing execution behavior.

## Main risk

```text
Suggestion deduplication must be session-aware.
```

## Runtime changes

```text
None
```

---

# Result

```text
Step 3.1 passes due diligence.
```

The project can proceed to:

```text
Step 3.2 — Define Minimal Planning Session Contract
```
