# Phase 7.4 Read-Only Validation Preview API Contract

Date: 2026-05-30  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Status: PLANNED  
Scope: API contract only

## Purpose

This document defines the first implementation contract for a read-only validation preview API.

The goal is to prepare EverythingAI for automated review support without changing persisted knowledge, quality scores, workspace trust health, rebuild behavior, or validation authority.

## Current Roadmap Position

```text
Phase 7.1 — Durable Knowledge Engine
Status: Complete

Phase 7.2 — Diagnostics & Explainability
Status: Complete

Phase 7.3 — Knowledge Quality + Workspace Trust Health
Status: Complete

Phase 7.4 Step 1 — Automated Review Placeholder
Status: Complete

Phase 7.4 Step 2 — Read-Only Validation Preview API
Status: Planned
```

## Core Rule

The validation preview API must be read-only.

It must not:

- persist records
- modify Wiki pages
- modify quality scores
- modify workspace trust health
- trigger rebuilds
- execute file actions
- mark content as approved
- override operator review

## Proposed Endpoint

```http
POST /api/wiki/pages/:pageId/validation-preview
```

## Request Body

Initial request body:

```json
{
  "useProvider": false,
  "provider": "ollama",
  "model": "llama3.1",
  "includeChunks": true,
  "maxChunks": 12
}
```

## Request Rules

### Default Mode

By default, the endpoint should not call any model provider.

If `useProvider` is not explicitly true, the endpoint should return a deterministic structural preview based on existing data only.

### Provider Mode

Provider use must require:

```json
{
  "useProvider": true
}
```

Provider mode should be implemented later and tested separately.

## Data Read By Endpoint

The endpoint may read:

- persisted Wiki page
- page sections
- page sources
- source chunks
- page quality summary
- page dependencies
- file fingerprints
- latest rebuild diagnostics

## Response Shape

```json
{
  "preview": {
    "page_id": "workspace-overview",
    "page_title": "Workspace Overview",
    "mode": "structural",
    "status": "not_started",
    "confidence_score": 0,
    "support_score": 0.72,
    "risk_score": 0.28,
    "recommendation": "needs_review",
    "issues": [
      {
        "severity": "medium",
        "type": "weak_evidence",
        "message": "Citation coverage is below the preferred threshold.",
        "evidence_refs": []
      }
    ],
    "summary": "This is a read-only validation preview based on existing quality and evidence signals.",
    "authority": "advisory",
    "persisted": false
  }
}
```

## Status Values

```text
not_started
passed
warning
failed
uncertain
```

For the first implementation, structural preview should use:

```text
not_started
warning
failed
```

Provider-generated statuses can be added later.

## Recommendation Values

```text
pass
needs_review
rebuild_recommended
reject_candidate
```

For the first implementation, prefer:

```text
pass
needs_review
rebuild_recommended
```

Do not emit `reject_candidate` until provider review and operator review workflows exist.

## Issue Types

Initial issue types:

```text
weak_evidence
missing_sources
missing_chunks
low_citation_coverage
runtime_degraded
stale_page
missing_dependencies
weak_source_warning
```

Future provider-assisted issue types:

```text
unsupported_claim
contradiction_risk
speculative_language
source_claim_mismatch
unclear_section
outdated_statement
```

## Structural Preview Logic

The first implementation should be deterministic.

Suggested logic:

- missing sources -> high severity issue
- missing chunks -> high severity issue
- page not active -> medium/high issue depending on status
- citation coverage below 0.5 -> medium issue
- no dependencies -> medium issue
- weak source warning -> medium issue

Suggested scoring:

```text
support_score = quality_score / 100
risk_score = 1 - support_score
confidence_score = 0
```

Reason:

Without provider review, there is no automated semantic confidence yet.

## Authority Model

The response must clearly mark:

```text
authority: advisory
persisted: false
```

This prevents the preview from being mistaken for an approval workflow.

## Initial Backend Implementation Plan

### Step 1

Add a small service:

```text
services/api/src/knowledge/wikiValidationPreviewService.js
```

Responsibilities:

- gather page quality signals
- compute structural preview
- return response contract
- perform no writes

### Step 2

Add route:

```text
POST /api/wiki/pages/:pageId/validation-preview
```

Location:

```text
services/api/src/routes/wiki.routes.js
```

### Step 3

Add tests:

```text
services/api/test/wikiRoutes.test.js
```

Tests should verify:

- route returns preview for existing page
- route returns 404 for missing page
- route does not persist rebuilds or validation records
- preview marks authority as advisory
- preview marks persisted as false

## Initial Frontend Implementation Plan

Do not implement frontend buttons until backend tests pass.

After backend validation, add frontend support:

```text
apps/everything-ai-ui/src/user/wikiJobsApi.ts
apps/everything-ai-ui/src/user/WikiDiagnosticsPanel.tsx
```

The first UI can show a read-only preview action later.

## Out Of Scope

Do not implement yet:

- provider calls
- stored review records
- database migration
- automatic review on rebuild
- claim-level review
- operator approval workflow
- quality score modifiers from review output

## Success Criteria

This phase is successful when:

1. The contract is documented.
2. The backend route returns a deterministic preview.
3. The preview is read-only.
4. Tests prove no persistence occurs.
5. Existing backend tests remain green.
6. The preview clearly says it is advisory and not persisted.

## Final Decision

The next code step should implement the backend structural validation preview only, with tests, before any UI action or provider integration is added.
