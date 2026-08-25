# Product Depth — Recovery Evidence Scope Alignment & Context Clarity Decision Gate

Date: 2026-08-25  
Status: PROPOSED AFTER #192 ACCEPTANCE ONLY  
Dependency: #190 accepted and #192 canonical synchronization accepted

## Purpose

Define one bounded Product Depth milestone that makes persisted recovery evidence easier to interpret when the configured source root, persisted scan-report root, and watcher root do not all refer to the same path.

## Verified existing facts

The accepted Client recovery view already receives and renders:

- configured recovery root selected from the current Folder Path or persisted fallback;
- `scanReport.rootPath` plus persisted `indexed`, `skipped`, and `failed` counts;
- watcher records with `rootPath`, `status`, `running`, `pending`, and `scheduled` fields;
- existing user-controlled Folder Path, Scan Report, Build Knowledge, and watcher controls;
- explicit read-only recovery guidance;
- no per-file retry.

`SourceRecoveryContext.tsx` currently renders the persisted scan report by its own `rootPath`, even when that path differs from the active configured recovery root. The evidence is genuine, but the UI does not explicitly say whether it applies to the active recovery root.

## Recommended bounded milestone

**Recovery Evidence Scope Alignment & Context Clarity**

### Required behavior

1. Compare the active recovery root with `scanReport.rootPath` using exact existing path values only.
2. If the roots match, identify the persisted scan outcomes as evidence for the active recovery root.
3. If the roots differ:
   - keep the persisted scan evidence visible;
   - clearly identify the root it belongs to;
   - state that those counts do not describe the currently configured recovery root;
   - do not borrow or reinterpret those outcomes for the active root.
4. Watcher evidence must remain tied only to an exact matching watcher root. If no watcher matches the active recovery root, state that no matching persisted watcher evidence is available rather than using another root's watcher state.
5. If no active recovery root is available, keep root applicability unknown and do not infer alignment.
6. Preserve the accepted #190 meaning of `indexed`, `skipped`, and `failed`; no new classification or confidence language.
7. Keep all guidance read-only. Rendering/opening the view must not start scan, extraction, Knowledge Base rebuild, watcher mutation, retry, or filesystem mutation.
8. Preserve mobile/readability behavior.

## Explicit non-goals

- no path guessing or fuzzy root matching;
- no new path-normalization identity semantics;
- no cross-root evidence merge;
- no freshness, health, progress, confidence, trust, success, readiness, root-cause, repair-completion, or retry inference;
- no per-file retry;
- no automatic scan, extraction, recovery, Knowledge Base rebuild, watcher start/stop, or mutation;
- no new backend endpoint or lifecycle/recovery state;
- no search/ranking/provider changes;
- no planning, approval, audit, undo, or filesystem-policy changes;
- no authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, or connector-runtime expansion.

## Acceptance criteria

- matching-root scan evidence is explicitly scoped to the active recovery root;
- mismatched-root scan evidence remains visible but is explicitly identified as belonging to another root;
- mismatched counts are never presented as current-root evidence;
- watcher evidence remains exact-root scoped and unavailable/unknown when no match exists;
- missing active-root or scan/watcher state is represented as unavailable/unknown rather than inferred;
- accepted #190 scan-outcome and watcher semantics remain unchanged;
- guidance remains user-controlled and non-mutating;
- focused browser acceptance covers matching-root, mismatched-root, and missing-root/evidence cases;
- complete inherited regression matrix through #190 passes on one unchanged candidate;
- independent diff review has no unresolved Critical or Important findings;
- rollback is milestone-scoped.

## Validation baseline

The candidate must preserve the full inherited Phase 1 + Phase 2 + Product Depth matrix, including #186 source-root recovery context, #190 recovery-outcome guidance, disposable-folder RC acceptance, and UI-governed planning → preview → approval → execution → audit → undo acceptance.

## Rollback

Revert only the milestone merge. Existing persisted scan/watcher data and all backend/runtime behavior remain unchanged.

## Authorization boundary

This document is a decision gate only. It does not authorize implementation until #192 is accepted and the next issue is explicitly released.
