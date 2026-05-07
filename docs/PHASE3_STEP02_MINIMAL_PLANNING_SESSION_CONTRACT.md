# Phase 3 — Step 3.2 Minimal Planning Session Contract

## Status

```text
COMPLETE
```

## Objective

Define the minimal planning session contract for EverythingAI before database schema and runtime implementation changes.

This contract keeps planning explicit, grouped, auditable, and compatible with the existing suggestion → preview → execution flow.

---

# Core Principle

A planning session is a user-controlled planning run.

It groups suggestions generated from selected files or a selected scope.

Planning sessions do not execute actions.

Correct lifecycle:

```text
Planning Session
  ↓
Suggestions
  ↓
Action Previews
  ↓
Approved Execution
```

---

# Permanent Rules

```text
Ingestion = automatic
Planning = user initiated
Execution = user approved
```

```text
Watcher must not create planning sessions automatically.
```

```text
Planning sessions may create suggestions only.
```

```text
Execution remains approval-gated through previews.
```

---

# Minimal Planning Session Record

```ts
export type PlanningSession = {
  id: string;
  status: PlanningSessionStatus;
  mode: PlanningSessionMode;
  source: PlanningSessionSource;
  settings: PlanningSessionSettings;
  summary: PlanningSessionSummary;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
```

---

# Planning Session Statuses

Minimal Phase 3 statuses:

```ts
export type PlanningSessionStatus =
  | 'draft'
  | 'running'
  | 'ready'
  | 'failed'
  | 'archived';
```

## draft

Session exists but has not yet generated suggestions.

## running

Session is actively generating suggestions.

## ready

Session completed and suggestions are ready for review.

## failed

Session failed during planning.

## archived

Session is no longer active but remains available for history.

---

# Planning Session Modes

Minimal Phase 3 modes:

```ts
export type PlanningSessionMode =
  | 'deterministic'
  | 'provider'
  | 'hybrid';
```

## Phase 3 default

```text
deterministic
```

Provider and hybrid modes are reserved for future AI-assisted planning expansion.

---

# Planning Session Source

```ts
export type PlanningSessionSource = {
  type: 'all_indexed_files' | 'file_ids' | 'source_path' | 'manual';
  fileIds?: string[];
  sourcePath?: string | null;
};
```

## Phase 3 recommended initial support

```text
all_indexed_files
file_ids
```

`source_path` can be formalized more strongly after sourceRootId relationships mature.

---

# Planning Session Settings

```ts
export type PlanningSessionSettings = {
  allowRename: boolean;
  allowMove: boolean;
  allowTag: boolean;
  allowCategory: boolean;
  requireApproval: boolean;
  confidenceThreshold: number;
  includeContent: boolean;
  includeInsights: boolean;
  includeEntities: boolean;
};
```

## Phase 3 defaults

```json
{
  "allowRename": true,
  "allowMove": true,
  "allowTag": true,
  "allowCategory": true,
  "requireApproval": true,
  "confidenceThreshold": 0.3,
  "includeContent": true,
  "includeInsights": true,
  "includeEntities": true
}
```

---

# Planning Session Summary

```ts
export type PlanningSessionSummary = {
  totalFilesAnalyzed: number;
  totalSuggestions: number;
  totalCategorySuggestions: number;
  totalTagSuggestions: number;
  totalMoveSuggestions: number;
  totalRenameSuggestions: number;
  failedFiles: number;
  skippedFiles: number;
};
```

---

# Suggestion Link Contract

`organization_suggestions` should support nullable session ownership:

```ts
planning_session_id: string | null;
```

## Compatibility rule

```text
planning_session_id = null
```

means legacy/direct suggestion generation.

This preserves:

```text
POST /api/suggestions
GET /api/suggestions
createActionPreview()
executeActionPreview()
```

---

# Session-Aware Suggestion Dedupe Rule

The current dedupe behavior is:

```text
file_id + action_type + suggested_value
```

For Phase 3, dedupe must become context-aware.

## Non-session suggestions

Preserve existing behavior:

```text
file_id + action_type + suggested_value
WHERE planning_session_id IS NULL
```

## Session suggestions

Use session-scoped dedupe:

```text
planning_session_id + file_id + action_type + suggested_value
```

This prevents one old suggestion from blocking future planning sessions.

---

# Minimal Planning Session API Contract

## Create session

```text
POST /api/planning/sessions
```

Request body:

```json
{
  "mode": "deterministic",
  "source": {
    "type": "all_indexed_files"
  },
  "settings": {}
}
```

Response:

```json
{
  "session": {}
}
```

---

## List sessions

```text
GET /api/planning/sessions
```

Response:

```json
{
  "sessions": []
}
```

---

## Get session

```text
GET /api/planning/sessions/:sessionId
```

Response:

```json
{
  "session": {},
  "suggestions": []
}
```

---

## Run session

```text
POST /api/planning/sessions/:sessionId/run
```

Response:

```json
{
  "session": {},
  "suggestions": []
}
```

---

# Minimal Runtime Service Contract

Future service:

```text
services/api/src/planning/planningSessionService.js
```

Recommended functions:

```ts
createPlanningSession(db, options)
listPlanningSessions(db, options)
getPlanningSession(db, { sessionId })
runPlanningSession(db, { sessionId })
```

---

# Job Layer Relationship

Phase 3 may run planning sessions synchronously first.

A future phase may wrap planning as:

```text
RUN_PLANNING job
```

But Phase 3 does not require job-wrapping planning immediately.

Reason:

```text
planning session lifecycle should stabilize first
```

---

# Planning Snapshot Relationship

Phase 3 should prepare for snapshots but does not need full snapshot capture immediately.

Recommended approach:

```text
planning_sessions first
planning_session_id on suggestions second
minimal source/settings/summary stored now
full planning_snapshots later if needed
```

---

# Step 3.2 Due Diligence

## Architecture consistency

```text
PASS
```

The contract follows Phase 0 planning architecture and Phase 3 goals.

## Compatibility safety

```text
PASS
```

Nullable session ownership preserves existing suggestion/preview/execution flows.

## Runtime safety

```text
PASS
```

No runtime code changed in this step.

## Main implementation watchpoint

```text
SQLite migration for nullable planning_session_id must be safe for existing databases.
```

---

# Result

```text
Step 3.2 passes due diligence.
```

The project can proceed to:

```text
Step 3.3 — Add Planning Session Schema
```
