# Phase 7.1 Durable Knowledge Engine Continuation Plan

Date: 2026-05-27  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Status: PLANNED  
Scope: Design and implementation planning only

## Purpose

This document starts the next product phase after the Phase 6 UserApp modularization closeout.

Phase 6 is frozen at a stable checkpoint. The next product phase should now focus on making EverythingAI's Wiki and knowledge layer more durable, persistent, evidence-backed, and ready for real user MVP testing.

This document does not change runtime behavior, database schemas, backend code, frontend code, UI design, or destructive file-action policy.

## Related Documents

Primary technical design already exists:

`docs/WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md`

Phase 6 closeout:

`docs/PHASE6_USERAPP_MODULARIZATION_CLOSEOUT_2026-05-27.md`

Phase 6 validation:

`docs/VALIDATION_2026-05-27_PHASE6_USERAPP_MODULARIZATION.md`

## Current Baseline

The current local MVP baseline remains:

- Backend: 88/88 tests passing from previous MVP checkpoint
- Frontend: `npm run typecheck` PASS
- Frontend: `npm run build` PASS
- Latest user bundle: `dist/assets/user-DtVDYtbp.js`
- Phase 6 UserApp modularization: frozen/closed

## Product Phase Name

Phase 7.1 — Durable Knowledge Engine Foundation

## Phase 7.1 Goal

Turn the existing controlled Wiki system into a durable knowledge engine by making source chunks, Wiki pages, page sections, citations, and evidence links persistent and rebuild-aware.

The target is not a UI redesign. The target is a stronger knowledge foundation.

## Existing Design Direction

The existing Wiki technical design already defines the direction:

- durable Wiki pages
- durable page sections
- durable page sources
- durable source chunks
- Wiki page relations
- rebuild tracking
- stable citation references
- source-backed evidence chain

The final principle from the existing design remains the core rule:

```text
claim
  -> citation
  -> source
  -> chunk
  -> file
  -> path
  -> extraction state
```

## Phase 7.1 Non-Negotiable Guardrails

The following rules remain active:

1. Do not weaken the 88/88 backend MVP baseline.
2. Do not mix UI redesign with durable knowledge implementation.
3. Do not change destructive file-action policy.
4. Do not allow AI summaries to become source-backed Wiki body content.
5. Do not introduce broad backend refactors.
6. Do not introduce broad frontend refactors.
7. Do not migrate to PostgreSQL, pgvector, or Qdrant in this step.
8. Do not implement enterprise governance as part of local MVP knowledge persistence.
9. Work directly on `main` unless the user explicitly changes the branch rule.

## Recommended First Engineering Step

Before implementation, inspect the current backend Wiki and knowledge implementation.

Files expected to inspect first:

```text
services/api/src/knowledge/knowledgeService.js
services/api/src/routes/wiki.routes.js
services/api/src/db/schema.sql
services/api/test/localMvp.test.js
```

Additional files may be included if they are directly used by Wiki generation, source previews, extraction, search, or citation mapping.

## First Implementation Ticket Recommendation

Title:

`Phase 7.1: Persist stable Wiki source chunks and evidence links`

Scope:

- inspect current backend Wiki implementation
- map existing schema and runtime structures
- identify where source chunks are currently generated
- identify how citations are currently mapped
- define the smallest possible schema addition
- add tests before runtime behavior is considered complete
- preserve current API behavior where possible

## Suggested Implementation Order

### Step 1 — Backend Inspection

Inspect current implementation and document:

- Wiki generation flow
- chunk creation flow
- citation/source mapping flow
- source preview flow
- current database schema
- current tests covering Wiki behavior

### Step 2 — Current-State Mapping Document

Create a short document:

`docs/PHASE7_1_CURRENT_WIKI_BACKEND_MAP.md`

This should map actual files, functions, tables, and routes before implementation.

### Step 3 — Minimal Schema Proposal

Based on the current code, propose the smallest schema change needed for:

- stable source chunks
- page-to-source links
- page-to-chunk links
- citation resolution

Do not implement until the proposal is clear.

### Step 4 — Tests First

Add backend tests for:

- persisted source chunks
- citation references resolving to durable records
- unchanged chunks remaining stable across rebuilds
- changed chunks creating stale or updated evidence state

### Step 5 — Implement Minimal Persistence

Only after tests and schema direction are clear:

- update schema
- add repository functions
- persist chunks/evidence links during Wiki rebuild
- ensure existing Wiki API output remains compatible

### Step 6 — Validate

Run backend validation:

```bash
cd services/api
npm test
```

If frontend API shapes are touched, also run:

```bash
cd apps/everything-ai-ui
npm run typecheck
npm run build
```

## What Not To Do First

Do not start with:

- UI redesign
- graph visualization
- AI Organization Workspace
- file move/rename automation
- embeddings provider expansion
- PostgreSQL/vector database migration
- full rebuild-orchestration rewrite
- broad service splitting

## Success Criteria For Phase 7.1 Foundation

Phase 7.1 foundation is successful when:

1. Current backend Wiki implementation is mapped.
2. Minimal persistence model is selected.
3. Durable source chunks are persisted.
4. Wiki page evidence links are persisted.
5. Citation references resolve to durable records.
6. Existing Wiki behavior remains compatible.
7. Backend tests pass.
8. Frontend typecheck/build pass if frontend-facing API shapes change.
9. The local MVP remains safe and non-destructive.

## Current Decision

Proceed into Phase 7.1 carefully by inspecting and mapping the real backend Wiki implementation before changing runtime code.

The next safe action is:

`Inspect services/api/src/knowledge/knowledgeService.js and related Wiki backend files.`
