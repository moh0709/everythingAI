# Phase 8 — Watcher Integration & Stale Archive Preview Foundation Release Decision

Date: 2026-09-18
Status: CLOSURE CANDIDATE — acceptance requires unchanged-head green qualification
Decision target: `PHASE8_WATCHER_STALE_PREVIEW_PASS`
Parent: #375
Closure issue: #385

## Scope accepted by this candidate

This closure candidate covers the bounded Stage 7 watcher integration defined by `docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md`:

1. deterministic stale-state evaluation for `current`, `source_changed`, `archive_missing`, `archive_changed`, `sidecar_missing`, and `conflict`;
2. deterministic watcher-to-review candidate generation with semantic dedupe identifiers;
3. narrow integration into the existing watcher through an error-bounded review hook;
4. preview-only update/rebuild planning bound to the current source fingerprint;
5. Admin/operator stale, rebuild, conflict, and manual-review visibility with approval blocking.

## Accepted implementation evidence chain

- Phase 8.1 stale-state evaluator — PR #376 merge `d33574b25642c6cc6236c3d46464e4da1d82c3d5`.
- Phase 8.2 watcher review adapter/dedupe — PR #378 merge `97cbe9671b14c597bc4a647e3bbe79e3b660d748`.
- Phase 8.3 safe watcher integration hook — PR #380 merge `612f8af22663b98725ac421a6da0f7f556cb00d0`.
- Phase 8.4 preview-only update/rebuild bridge — PR #382 merge `0d1960bce368c597e0e2e173bbde08eabfdaae33`.
- Phase 8.5 Admin stale/rebuild/conflict visibility — PR #384 merge `ae2204c0ae3ba75d3eac5860a200be083d7af744`.

## Safety and authority boundary

Watcher integration is review/preview-only. It may detect stale archive state, create deterministic review candidates, and generate update/rebuild previews. It does not directly execute archive operations.

**Watcher-driven archive execution remains prohibited.**

This decision does not authorize automatic approval, watcher-driven archive overwrite, source delete/move/rename, direct calls from watcher integration into the archive executor or metadata sidecar writer, broad full-drive watch enablement by default, privileged production infrastructure or secrets, destructive production migration/cutover, external certification/load commitments, commercial SLA/SLO commitments, or material automatic governance/action/recovery authority expansion.

Stage 8 AI enrichment improvements and Stage 9 advanced document intelligence remain separately governed future work.

## Closure rule

`PHASE8_WATCHER_STALE_PREVIEW_PASS` may be declared only after the dedicated Phase 8 closure workflow and the complete applicable inherited workflow matrix pass on one unchanged candidate head with clean review state. Until then this document remains a closure candidate, not an accepted release.

Canonical roadmap/state synchronization occurs only after this closure candidate is accepted.

## Rollback

The Phase 8 closure artifacts are independently reversible. Each Phase 8.1–8.5 implementation slice remains independently reversible, and Phase 7 plus all earlier accepted milestones remain intact.
