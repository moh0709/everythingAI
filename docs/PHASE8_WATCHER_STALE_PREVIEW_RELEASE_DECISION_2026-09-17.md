# Phase 8 — Watcher Stale Preview Release Decision

Date: 2026-09-17
Status: CLOSURE CANDIDATE — acceptance requires unchanged-head green qualification
Decision target: `PHASE8_WATCHER_STALE_PREVIEW_PASS`
Parent: #375
Closure issue: #385

## Scope accepted by this closure candidate

This closure candidate covers the bounded Stage 7 watcher integration foundation built on the accepted Phase 7 AI Organization Workspace foundation:

1. **Archive stale-state evaluator** — deterministic `current`, `source_changed`, `archive_missing`, `archive_changed`, `sidecar_missing`, and `conflict` classification with fail-closed evidence validation.
2. **Watcher review adapter and semantic dedupe** — watcher/source evidence becomes stable review candidates without timestamp-based identity or execution capability.
3. **Safe watcher integration hook** — the existing watcher may emit post-cycle review evidence through an optional injected callback; callback failure is bounded and does not create archive mutation authority.
4. **Preview-only update/rebuild bridge** — source changes and missing archive copies become approval-required previews, sidecar-missing becomes sidecar-regeneration preview metadata, and archive-changed/conflict remain manual-review-only.
5. **Admin stale-state review visibility** — operators can see/filter stale states and approval remains blocked for manual-review states while preserving approval-intent-only UI semantics.

## Acceptance evidence chain

- Phase 8.1: PR #376, merge `d33574b25642c6cc6236c3d46464e4da1d82c3d5`.
- Phase 8.2: issue #377 / PR #378, merge `97cbe9671b14c597bc4a647e3bbe79e3b660d748`.
- Phase 8.3: issue #379 / PR #380, merge `612f8af22663b98725ac421a6da0f7f556cb00d0`.
- Phase 8.4: issue #381 / PR #382, merge `0d1960bce368c597e0e2e173bbde08eabfdaae33`.
- Phase 8.5: issue #383 / PR #384, merge `ae2204c0ae3ba75d3eac5860a200be083d7af744`.
- Phase 8.6: closure issue #385 / dedicated closure qualification candidate.

## Safety and authority boundary

The watcher remains an evidence producer, not an archive executor. It does not import or call the archive executor or metadata sidecar writer. Watcher candidates and update/rebuild previews explicitly deny execution, automatic approval, and filesystem mutation. The existing archive executor remains separately approval-gated, copy-only, source-preserving, and non-overwriting.

This decision does **not** authorize watcher-driven archive execution, automatic approval, archive overwrite, source delete/move/rename, broad full-drive watcher enablement by default, privileged production infrastructure, real production secrets, destructive production migration/cutover, external certification/load commitments, commercial SLA/SLO commitments, or material automatic governance/action/recovery expansion.

Stage 8 AI enrichment improvements and Stage 9 advanced document intelligence remain separately governed future work.

## Closure rule

`PHASE8_WATCHER_STALE_PREVIEW_PASS` may be declared only after the dedicated Phase 8 closure workflow and the complete applicable inherited workflow matrix pass on one unchanged candidate head with clean review state. Until then this document remains a closure candidate, not an accepted release.

Canonical project-state and roadmap files are intentionally not synchronized in this candidate. They will be updated only after the closure candidate is accepted, preserving evidence-before-assertion.

## Rollback

The closure artifacts are independently reversible. Phase 8.1–8.5 were delivered as separate bounded merges and remain individually identifiable for rollback. The accepted Phase 7 baseline remains the predecessor boundary.
