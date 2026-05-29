# Phase 7.3 Knowledge Quality Layer Plan

Date: 2026-05-28  
Repository: `moh0709/everythingAI`  
Branch: `main`  
Status: PLANNED  
Scope: Architecture and implementation planning only

## Purpose

This document defines the next roadmap step after Phase 7.2 Knowledge Diagnostics & Explainability UI.

EverythingAI now has a durable Wiki knowledge engine with persistence, evidence chunks, dependencies, fingerprints, rebuild history, diagnostics, and frontend explainability. The next logical product layer is a Knowledge Quality Layer that evaluates how trustworthy each knowledge unit is.

This document is planning-only. It does not change runtime behavior, database schemas, backend code, frontend code, UI design, or destructive file-action policy.

## Current Roadmap Position

The current roadmap state is approximately:

```text
Phase 6 — Controlled UserApp modularization
Status: CLOSED / FROZEN

Phase 7.1 — Durable Knowledge Engine Foundation
Status: IMPLEMENTED + VALIDATED

Phase 7.2 — Knowledge Diagnostics & Explainability UI
Status: ACTIVE / MOSTLY VALIDATED

Phase 7.3 — Knowledge Quality Layer
Status: NEXT PLANNED PHASE
```

Phase 7.2 created the visibility foundation needed for Phase 7.3.

## Why This Phase Exists

A durable knowledge engine is not enough by itself.

The system must also distinguish between:

- source-backed knowledge
- weakly supported knowledge
- stale knowledge
- AI-validated knowledge
- human-validated knowledge
- contradicted knowledge
- unreviewed knowledge
- operationally degraded knowledge

Without a quality layer, all persisted knowledge can appear equally trustworthy even when it is not.

## Core Principle

Knowledge quality must be multi-factor and weighted.

AI validation is useful and scalable, but it must not have the same authority as human validation.

Human validation has the highest authority. AI validation is advisory, assistive, and review-supporting.

## Proposed Validation Hierarchy

```text
Human validation
  > source/evidence validation
  > runtime integrity validation
  > AI validation
  > unvalidated generated state
```

## Validation Types

### 1. Source Validation

Checks whether the knowledge is grounded in actual source material.

Signals:

- citations exist
- cited chunks exist
- cited files exist
- source paths are valid
- extracted text exists
- citation coverage is sufficient

Suggested authority weight: HIGH

Reason:

Source validation proves that the knowledge is traceable. It does not prove that interpretation is perfect, but it is foundational.

### 2. Runtime Integrity Validation

Checks whether the operational state of the knowledge is healthy.

Signals:

- page status is active/stale/failed/archived
- source fingerprint changed
- dependency graph is intact
- rebuilds are succeeding
- sources are missing or present
- chunks are stale or current

Suggested authority weight: HIGH OPERATIONAL

Reason:

Even previously correct knowledge can become unsafe if its source changes or disappears.

### 3. AI Validation

AI can validate knowledge for structure, consistency, and support quality.

AI validation can check:

- whether claims are supported by cited chunks
- whether page content overreaches the evidence
- whether citations are dense enough
- whether contradictions exist between sources
- whether duplicate pages conflict
- whether outdated statements are likely
- whether a section has weak evidence
- whether generated wording is too speculative

Suggested authority weight: MEDIUM

Reason:

AI validation is fast and useful, but it is not authoritative truth. It can help prioritize human review and detect likely problems.

### 4. Human Validation

Human review is the highest authority.

Human validators can:

- approve knowledge
- reject knowledge
- mark as needs review
- override AI validation
- confirm source interpretation
- mark content as authoritative
- classify source reliability
- resolve conflicts

Suggested authority weight: HIGHEST

Reason:

Human validation is required for high-trust or enterprise-grade knowledge.

## Proposed Knowledge Quality Grades

A simple initial grade model:

| Grade | Meaning |
|---|---|
| A | Human-validated, source-backed, fresh, no conflicts |
| B | Source-backed, fresh, AI-validated, no known conflicts |
| C | Source-backed but weak/partial evidence or no AI validation |
| D | Stale, weak citation coverage, or changed dependencies |
| F | Unsupported, failed, contradicted, or rejected |

## Proposed Status Fields

Future implementation may introduce fields such as:

```text
quality_grade
quality_score
source_validation_status
ai_validation_status
human_validation_status
runtime_validation_status
last_ai_validated_at
last_human_validated_at
validated_by
validation_notes
conflict_status
review_required
```

These fields may initially be computed rather than persisted.

## Proposed Quality Score Factors

A future quality score may combine:

| Factor | Description |
|---|---|
| Citation coverage | how much of the page is source-backed |
| Evidence density | number and quality of supporting chunks |
| Source availability | whether cited files/chunks still exist |
| Freshness | whether source fingerprints changed |
| Rebuild health | whether recent rebuilds succeeded |
| AI validation | automated consistency/support checks |
| Human validation | human approval/rejection/review |
| Conflict state | whether contradictions are detected |
| Source type | official/manual/internal/user-generated |

## Suggested Initial Weighting

Initial weighting should be conservative:

| Category | Suggested Weight |
|---|---:|
| Human validation | 35% |
| Source/evidence validation | 25% |
| Runtime integrity | 20% |
| AI validation | 15% |
| Freshness/recency | 5% |

Important:

These weights are planning defaults only. They should be validated through product testing.

## AI Validation Rules

AI validation must be bounded by strict rules:

1. AI validation cannot mark knowledge as fully authoritative.
2. AI validation cannot override human rejection.
3. AI validation cannot remove the need for human review on high-impact knowledge.
4. AI validation must cite the evidence it used.
5. AI validation must return structured reasons, not just a score.
6. AI validation must identify uncertainty.
7. AI validation must be repeatable enough to support audit.

## Human Validation Rules

Human validation should support:

- approved
- rejected
- needs_review
- authoritative
- deprecated
- disputed

Human validation should record:

- validator identity, if available
- timestamp
- decision
- notes
- scope of validation

## Quality Scope

The quality layer should eventually work at multiple levels:

```text
Wiki page
  -> section
    -> claim
      -> citation
        -> chunk
          -> source file
```

Initial implementation should start at Wiki page level, then later move to section level.

Claim-level validation is valuable but should not be the first implementation step because it is more complex.

## Proposed Implementation Sequence

### Step 1 — Design Computed Page Quality

Add a computed quality model using existing data only.

Inputs:

- page status
- citation coverage score
- source count
- chunk count
- stale page count
- dependency count
- rebuild status
- AI/human validation placeholders

No schema change required for the first step.

### Step 2 — Expose Quality In Diagnostics

Show quality grade and quality reasons in the existing diagnostics panel.

### Step 3 — Add AI Validation Records

Introduce AI validation as a separate record type, not as direct truth.

Possible table later:

```text
wiki_ai_validations
```

### Step 4 — Add Human Validation Records

Introduce human validation decisions separately.

Possible table later:

```text
wiki_human_validations
```

### Step 5 — Combine Into Trust Score

Compute final grade from source, runtime, AI, and human signals.

## First Safe Implementation Recommendation

Do not add database tables first.

Start with computed page-level quality from existing durable diagnostics data.

Recommended first implementation ticket:

```text
Phase 7.3: Add computed Wiki page quality signals to diagnostics
```

Scope:

- backend read-only computed quality summary
- no schema changes
- no AI calls yet
- no human workflow yet
- frontend displays quality grade/reasons
- validated with tests/build

## Out Of Scope For First Step

Do not start with:

- claim-level extraction
- autonomous AI approval
- human reviewer accounts
- enterprise approval workflow
- database migration
- new role model
- source ranking UI
- governance enforcement automation

## Success Criteria

Phase 7.3 foundation is successful when:

1. Each Wiki page can show an initial computed quality grade.
2. The grade is explainable.
3. The grade uses existing evidence/runtime signals.
4. AI validation is clearly marked as advisory when added later.
5. Human validation is reserved as the highest authority.
6. No existing Wiki behavior is weakened.
7. Backend and frontend validation pass.

## Final Decision

EverythingAI should move next from diagnostics visibility into knowledge quality governance.

The immediate next implementation should be a conservative computed quality layer based on existing evidence and runtime state, followed later by advisory AI validation and authoritative human validation.
