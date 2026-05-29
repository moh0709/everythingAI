# Phase 7.4 AI Validation Layer Plan

Date: 2026-05-30  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Status: PLANNED  
Scope: Architecture and implementation planning only

## Purpose

This document defines the next roadmap layer after Phase 7.3 Knowledge Quality and Workspace Trust Health.

EverythingAI now has computed page quality signals and aggregate workspace trust health. The next layer is AI-assisted validation of knowledge quality.

AI validation must be advisory. It must support operators and human reviewers, but it must not become the highest authority.

## Current Roadmap Position

```text
Phase 7.1 — Durable Knowledge Engine
Status: IMPLEMENTED + VALIDATED

Phase 7.2 — Diagnostics & Explainability UI
Status: IMPLEMENTED + VALIDATED

Phase 7.3 — Knowledge Quality + Workspace Trust Health
Status: IMPLEMENTED / VALIDATING UI CHECKPOINTS

Phase 7.4 — AI Validation Layer
Status: NEXT PLANNED PHASE
```

## Core Principle

AI validation is a reviewer assistant, not an authority.

The validation hierarchy remains:

```text
Human validation
  > source/evidence validation
  > runtime integrity validation
  > AI validation
  > unvalidated generated state
```

AI validation can raise warnings, propose confidence signals, and identify likely problems. It cannot mark knowledge as fully authoritative and cannot override a human decision.

## What AI Validation Should Check

AI validation should evaluate whether a Wiki page appears properly supported by its persisted evidence.

Initial checks:

- unsupported claims
- weak citation density
- contradiction risk
- overconfident wording
- speculative wording
- missing source coverage
- stale or degraded runtime state
- low evidence density
- source/claim mismatch
- unclear or incomplete generated sections

## Initial Validation Scope

Start at page level.

```text
Wiki page
  -> page markdown
  -> persisted sources
  -> persisted chunks
  -> computed quality summary
  -> AI validation result
```

Do not start with claim-level validation in the first implementation. Claim-level validation is valuable but more complex.

## AI Validation Output Contract

The AI validation result should be structured and auditable.

Proposed shape:

```json
{
  "page_id": "workspace-overview",
  "status": "passed | warning | failed | uncertain",
  "confidence_score": 0.82,
  "support_score": 0.76,
  "risk_score": 0.18,
  "issues": [
    {
      "severity": "low | medium | high",
      "type": "unsupported_claim | weak_evidence | contradiction_risk | stale_context | speculative_language",
      "message": "The section makes a claim that is not clearly supported by cited chunks.",
      "evidence_refs": ["S1:C1"]
    }
  ],
  "recommendation": "pass | needs_human_review | rebuild_recommended | reject_candidate",
  "summary": "The page is mostly source-backed, but one section needs stronger support."
}
```

## Authority Rules

AI validation must follow these rules:

1. AI cannot mark a page as human-approved.
2. AI cannot override human rejection.
3. AI cannot convert a page to authoritative state.
4. AI cannot remove review-required status if runtime/source validation is degraded.
5. AI must provide reasons and issue categories.
6. AI validation must remain inspectable in diagnostics.
7. AI validation must be clearly labeled as advisory.

## Suggested Status Values

```text
not_started
passed
warning
failed
uncertain
```

## Suggested Recommendation Values

```text
pass
needs_human_review
rebuild_recommended
reject_candidate
```

## How AI Validation Should Influence Quality

AI validation may affect computed quality, but only with limited weight.

Suggested first influence:

- passed: small positive modifier
- warning: small negative modifier
- failed: medium negative modifier
- uncertain: no positive modifier, requires review

AI validation must not outweigh:

- human validation
- source availability
- citation coverage
- runtime integrity

## First Safe Implementation Recommendation

Do not add autonomous AI calls immediately.

First implementation should add placeholders and data contracts only:

```text
Phase 7.4 Step 1 — AI validation contract and diagnostics placeholder
```

Scope:

- add AI validation types/status to docs and frontend expectations
- keep existing `ai_validation: not_started`
- add visible explanation in UI that AI validation is advisory and not started
- no database schema change
- no provider call
- no automatic scoring influence

## Second Safe Implementation Recommendation

```text
Phase 7.4 Step 2 — Read-only AI validation preview service
```

This should:

- accept one page ID
- gather page, sources, and chunks
- call configured provider only when explicitly requested
- return structured validation result
- not persist anything at first
- not change quality score yet

## Third Safe Implementation Recommendation

```text
Phase 7.4 Step 3 — Persist AI validation records
```

Possible future table:

```text
wiki_ai_validations
```

Potential fields:

```text
id
page_id
status
confidence_score
support_score
risk_score
issues_json
recommendation
summary
model_name
provider
created_at
validated_at
```

This should only happen after preview output is stable.

## Human Validation Must Come After AI Validation Preview

Human validation should remain a separate later phase.

Possible human validation statuses:

```text
not_started
approved
rejected
needs_review
authoritative
deprecated
disputed
```

Human validation should ultimately override AI validation in final trust decisions.

## Out of Scope For First AI Validation Step

Do not implement yet:

- automatic AI validation on every rebuild
- claim-level validation
- autonomous approval
- human reviewer roles
- enterprise approval workflows
- scoring changes based on AI output
- database migration
- irreversible governance decisions

## Success Criteria

Phase 7.4 starts correctly when:

1. AI validation has a documented contract.
2. The UI clearly shows AI validation as advisory.
3. Existing quality/trust health remains deterministic.
4. No provider calls happen without explicit user action.
5. No human validation authority is weakened.
6. Backend and frontend validation remain green.

## Final Decision

The next implementation should be a small frontend/documentation step that makes AI validation visible as an upcoming advisory layer without yet introducing provider calls or persistence.
