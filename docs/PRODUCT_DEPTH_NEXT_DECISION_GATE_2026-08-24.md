# Product Depth — Next Decision Gate

Date: 2026-08-24  
Predecessor: `PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS` (#162 / PR #163)  
Accepted merge: `241b8c8cb723a43be1ede211fdfc55acf15d96e2`

## Purpose

Define the next bounded Product Depth direction after the accepted governed-action lifecycle release without silently authorizing Enterprise Platform, privileged-host, or material connector/runtime expansion.

## Recommended next direction

**Knowledge Evidence Quality & Freshness Clarity**

EverythingAI already exposes or persists source-backed evidence signals including citation coverage, weak-source warnings, source fingerprints, indexed source context, and Knowledge Base rebuild/refresh state. The next bounded product improvement should make those existing facts easier to understand and act on without inventing new confidence or freshness calculations.

### User questions to answer

1. Is this knowledge page strongly or weakly supported by source evidence?
2. Which sources or evidence contexts support the page?
3. When evidence is weak, what exact condition is known versus unknown?
4. Is there enough persisted state to explain whether the current Knowledge Base view may need refresh/rebuild?
5. What safe, explicit next action can the user take without automatic mutation?

## First bounded milestone recommendation

Create one implementation milestone focused on **evidence-quality explanation and safe refresh/rebuild guidance** in the Client Knowledge Base.

Acceptance should require:

- existing citation coverage and weak-source warning values are presented with plain-language explanations;
- existing source fingerprint/rebuild state is used only where it truthfully supports freshness/rebuild guidance;
- unknown freshness remains explicitly unknown rather than inferred;
- users can navigate to genuine source evidence from the explanation;
- no frontend recalculation of trust, confidence, provenance, or freshness;
- no automatic rebuild, file mutation, approval bypass, or backend planning-policy change;
- mobile/readability behavior remains sound;
- the complete inherited regression matrix remains green on one unchanged candidate;
- independent diff review finds no unresolved Critical or Important findings;
- rollback is milestone-scoped.

## Alternative bounded options

### A. Knowledge evidence quality/freshness clarity — recommended

Build on the accepted citation, source-inspection, diagnostics, and rebuild/refresh surfaces. This extends the current trust/evidence product direction with low architectural risk.

### B. Search refinement and filtering UX

Improve narrowing and inspection of existing local search results using already available metadata. This must not change semantic model/provider architecture or present ranking signals as confidence.

### C. Audit-history inspection depth

Improve read-only inspection/filtering of existing governed-action audit records and undo outcomes. This must not change execution, audit persistence, rollback semantics, or permissions.

## CEO-gated directions

The following are not authorized by this package and require explicit CEO approval before implementation:

- authentication or identity architecture;
- tenancy/workspaces or multi-user production isolation;
- cloud deployment;
- production database migration or object storage;
- privileged host/systemd changes;
- material connector/runtime expansion;
- commercial or materially architectural scope changes.

## Dependency rule

Do not release the recommended implementation milestone until #164 canonical synchronization is accepted and merged. Once #164 is accepted, the recommended evidence-quality milestone is dependency-satisfied and may be released autonomously because it is bounded, reversible, and inside the already accepted Product Depth direction.

## Rollback

This decision package is documentation-only and independently reversible. Any later implementation milestone must carry its own rollback boundary and validation evidence.
