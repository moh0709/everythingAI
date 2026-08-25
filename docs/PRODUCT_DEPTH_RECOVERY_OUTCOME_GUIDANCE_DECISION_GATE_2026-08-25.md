# Product Depth — Recovery Outcome Interpretation & Safe Next-Step Guidance Decision Gate

Date: 2026-08-25  
Status: PROPOSED AFTER #188 ACCEPTANCE ONLY  
Dependency: #186 accepted and #188 canonical synchronization accepted

## Purpose

Define one bounded Product Depth milestone that improves user comprehension of already persisted source-root scan and watcher outcomes without changing recovery mechanics, backend lifecycle, mutation behavior, or infrastructure scope.

## Verified existing facts

The accepted Client recovery context already receives and renders:

- configured source-root path;
- persisted latest scan report with `indexed`, `skipped`, and `failed` counts;
- persisted watcher records with `status`, `running`, `pending`, and `scheduled` fields;
- existing user-controlled Folder Path, Scan Report, Build Knowledge, and watcher controls;
- an explicit read-only recovery-context boundary;
- no per-file retry.

These facts are sufficient for a frontend-only comprehension improvement. No backend calculation is required.

## Recommended bounded milestone

**Recovery Outcome Interpretation & Safe Next-Step Guidance**

The Client should explain what the persisted scan and watcher facts mean, what they do not prove, and which existing user-controlled action is appropriate to inspect next.

### Required behavior

1. Distinguish scan outcomes truthfully:
   - `indexed` = files recorded as indexed by the persisted scan report;
   - `skipped` = files skipped by that scan report, without reclassifying them as failed or ready;
   - `failed` = files recorded as failed by that scan report, without inventing the failure cause.
2. If no persisted scan report is loaded, state that no scan outcome can be concluded from this view.
3. Explain watcher state only as persisted monitoring state:
   - `running`, `pending`, `scheduled`, and status text must not be treated as extraction, recovery, or Knowledge Base success.
4. Provide safe next-step guidance using only existing controls and navigation:
   - inspect Folder Path when source-root scope is uncertain;
   - inspect Scan Report when scan outcomes need detail;
   - use existing Build Knowledge only when the user intentionally chooses a source-root rebuild/rescan flow;
   - use existing watcher controls only when the user intentionally chooses monitoring changes.
5. Keep the guidance itself read-only. Rendering or opening the recovery context must not trigger scan, extraction, rebuild, watcher changes, retry, or filesystem mutation.
6. Preserve mobile/readability behavior.

## Explicit non-goals

- no per-file retry;
- no automatic scan, extraction, recovery, Knowledge Base rebuild, watcher start/stop, or mutation;
- no root-cause inference beyond persisted fields;
- no health, progress, confidence, trust, freshness, success, readiness, or repair-completion score;
- no new backend endpoint or lifecycle/recovery state;
- no search/ranking/provider changes;
- no planning, approval, audit, undo, or filesystem-policy changes;
- no authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, or connector-runtime expansion.

## Acceptance criteria

- wording maps only to persisted scan/watcher facts;
- skipped, failed, and indexed outcomes remain semantically distinct;
- watcher state is not represented as recovery success;
- missing persisted state is represented as unknown/unavailable rather than inferred;
- user guidance points only to existing controls and remains explicitly user-controlled;
- rendering the guidance performs no mutation or recovery action;
- focused browser acceptance covers representative scan/watcher combinations plus missing-state behavior;
- complete inherited regression matrix through #186 passes on one unchanged candidate;
- independent diff review has no unresolved Critical or Important findings;
- rollback is milestone-scoped.

## Validation baseline

The candidate must preserve the full inherited Phase 1 + Phase 2 + Product Depth matrix, including the #186 source-root recovery-context acceptance, disposable-folder RC acceptance, and UI-governed planning → preview → approval → execution → audit → undo acceptance.

## Rollback

Revert only the milestone merge. Existing persisted scan/watcher data and all backend/runtime behavior remain unchanged.

## Authorization boundary

This document is a decision gate only. It does not authorize implementation until #188 is accepted and the next issue is explicitly released.
