# Phase 7.5 Human Validation Layer Plan

Date: 2026-05-31  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Status: PLANNED  
Scope: Architecture and implementation planning only

## Purpose

This document defines the next roadmap layer after Phase 7.4 Automated Review Foundation.

EverythingAI now has durable Wiki knowledge, evidence, diagnostics, computed quality signals, workspace trust health, and a read-only validation preview API. The next layer is human validation.

Human validation is the highest authority signal in the knowledge governance model.

## Current Roadmap Position

```text
Phase 7.1 — Durable Knowledge Engine
Status: COMPLETE

Phase 7.2 — Diagnostics & Explainability
Status: COMPLETE

Phase 7.3 — Knowledge Quality + Workspace Trust Health
Status: COMPLETE

Phase 7.4 — Automated Review Foundation
Status: COMPLETE

Phase 7.5 — Human Validation Layer
Status: NEXT PLANNED PHASE
```

## Core Principle

Human validation must remain stronger than automated review.

Validation hierarchy:

```text
Human validation
  > source/evidence validation
  > runtime integrity validation
  > automated validation preview
  > unvalidated generated state
```

The human validation layer should not weaken source-backed requirements. A human decision can mark knowledge as reviewed or approved, but source integrity and runtime health must remain visible.

## Initial Scope

Start at Wiki page level.

```text
Wiki page
  -> human validation state
  -> reviewer identity
  -> review timestamp
  -> review notes
```

Do not start with claim-level validation. Claim-level validation can come later after page-level review is stable.

## Proposed Validation Statuses

Initial statuses:

```text
unreviewed
reviewed
approved
needs_attention
rejected
```

Meaning:

- `unreviewed`: no human decision exists yet
- `reviewed`: a human has reviewed the page but did not mark it fully approved
- `approved`: a human has approved the page as acceptable for current use
- `needs_attention`: a human found issues or wants revision
- `rejected`: a human rejected the current page content

## Proposed Data Fields

Future table:

```text
wiki_human_validations
```

Fields:

```text
id
page_id
status
reviewed_by
reviewed_at
notes
created_at
updated_at
```

Optional later fields:

```text
scope
review_level
expires_at
source_reviewed
content_reviewed
review_version
```

## Authority Rules

Human validation rules:

1. Human validation is the strongest validation signal.
2. Human validation does not remove evidence requirements.
3. Human validation does not hide stale runtime state.
4. Human validation can override automated review recommendations.
5. Human rejection must not be overridden by automated review.
6. Human validation must be auditable.
7. Review history should be preserved in later iterations.

## First Safe Implementation Recommendation

Do not modify quality scoring first.

Start with a persistence layer and read/write API for page-level human validation.

First implementation:

```text
Phase 7.5 Step 1 — Persist human validation state per Wiki page
```

Scope:

- create schema table through repository ensure function
- add repository functions
- add read endpoint
- add write endpoint
- add backend tests
- no frontend changes yet
- no quality score changes yet
- no workspace trust changes yet

## Proposed Endpoints

Read validation:

```http
GET /api/wiki/pages/:pageId/human-validation
```

Update validation:

```http
POST /api/wiki/pages/:pageId/human-validation
```

Example request body:

```json
{
  "status": "approved",
  "reviewed_by": "operator",
  "notes": "Reviewed source-backed page and approved for internal use."
}
```

Example response:

```json
{
  "validation": {
    "page_id": "workspace-overview",
    "status": "approved",
    "reviewed_by": "operator",
    "reviewed_at": "2026-05-31T00:00:00.000Z",
    "notes": "Reviewed source-backed page and approved for internal use."
  }
}
```

## Validation Rules For API

The API should:

- reject unknown statuses
- reject missing page IDs
- return `unreviewed` if no record exists yet
- preserve page content unchanged
- preserve rebuild history unchanged
- not trigger rebuilds
- not modify source chunks
- not modify computed quality directly in first step

## Future Quality Integration

After the persistence layer is validated, human validation can be surfaced in diagnostics and later influence quality state.

Future influence example:

- approved: positive trust signal
- reviewed: neutral/positive signal
- needs_attention: warning signal
- rejected: strong negative signal
- unreviewed: neutral but visibly incomplete

This must be done after tests prove persistence is stable.

## Frontend Later

After backend validation:

```text
apps/everything-ai-ui/src/user/wikiJobsApi.ts
apps/everything-ai-ui/src/user/WikiDiagnosticsPanel.tsx
```

Initial UI:

```text
Human Validation
Status: unreviewed
Reviewed by: —
Reviewed at: —
Notes: —
```

Write controls should come after read-only display is stable.

## Out Of Scope For Step 1

Do not implement yet:

- role-based permissions
- reviewer accounts
- enterprise approval workflow
- claim-level validation
- validation expiry
- quality score modifiers
- workspace trust modifiers
- frontend write controls

## Success Criteria

Phase 7.5 starts correctly when:

1. Human validation schema exists.
2. Page-level validation can be read.
3. Page-level validation can be updated.
4. Unknown statuses are rejected.
5. Missing pages return 404.
6. Page content and rebuild records are not modified by validation updates.
7. Backend tests pass.

## Final Decision

The next code step should implement the backend persistence and API for page-level human validation without changing quality scoring or frontend UI yet.
