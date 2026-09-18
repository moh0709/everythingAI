# Phase 9 — AI Metadata Enrichment Controls Foundation Release Decision

Date: 2026-09-18  
Status: CLOSURE CANDIDATE — acceptance requires unchanged-head green qualification  
Decision target: `PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS`  
Parent: #389  
Closure issue: #398

## Scope accepted by this candidate

This closure candidate covers design Stage 8 from `docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md` as a bounded enrichment-controls foundation:

1. provider-neutral AI metadata normalization for `summary`, `classification`, and `tags`;
2. explicit profile-level enable/disable behavior with fail-closed rejection of generated input while disabled;
3. required field-level generator and evidence provenance;
4. deterministic preview-planner integration with enrichment included in immutable plan identity;
5. sidecar integration preserving AI provenance and explicit user-edit provenance;
6. Admin/operator visibility for enrichment state and AI-vs-user provenance;
7. explicit preservation of no-execution/no-automatic-approval/no-new-filesystem-authority semantics.

## Accepted implementation evidence chain

- Phase 9.1 provider-neutral enrichment policy — PR #391 merge `36d2c6544da99e0cdca03d1cebabbfcea2dc6035`.
- Phase 9.2 preview planner enrichment integration — PR #393 merge `e961cb3e754fbad2313c7ee949daea22fa568ef3`.
- Phase 9.3 sidecar enrichment and user-edit provenance — PR #395 merge `68d391d058383f97ced1227a4d8d9a00501422f6`.
- Phase 9.4 Admin enrichment controls/provenance visibility — PR #397 merge `da0d5278f1f49451befd60ba3f7226c113d31b77`.

## Safety and authority boundary

This foundation is provider-neutral and does not itself invoke an AI provider/model. The Admin toggle is preference intent for future preview generation only.

Phase 9 does not authorize automatic model invocation, automatic approval, automatic archive execution, watcher-driven execution, archive overwrite, source delete/move/rename, broad full-drive watch by default, privileged production infrastructure/secrets, destructive production migration/cutover, external certification/load commitments, commercial SLA/SLO commitments, or material automatic governance/action/recovery expansion.

**Design Stage 9 advanced document intelligence remains deferred.** OCR/layout/table/image/chart extraction improvements are not accepted by this decision.

## Closure rule

`PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS` may be declared only after the dedicated Phase 9 closure workflow and the complete applicable inherited workflow matrix pass on one unchanged candidate head with clean review state.

Canonical roadmap/state synchronization occurs only after this closure candidate is accepted.

## Rollback

The Phase 9 closure artifacts are independently reversible. Each Phase 9.1–9.4 implementation slice remains independently reversible. Phase 8, Phase 7, Phase 6, and all earlier accepted milestones remain intact.
