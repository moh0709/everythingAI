# EverythingAI — Current Roadmap

Date: 2026-09-18

## Accepted program position

- Phase 2 — `PHASE2_PASS` — complete.
- Product Depth Comprehension — `PRODUCT_DEPTH_COMPREHENSION_PASS` — complete.
- Cross-Surface Context Continuity — `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS` — complete.
- Workspace Context Trust & Provenance — `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS` — complete.
- Governed-Action Trust & Evidence — `GOVERNED_ACTION_TRUST_EVIDENCE_PASS` — complete.
- Governed-Action Review Context — `GOVERNED_ACTION_REVIEW_CONTEXT_PASS` — complete.
- Governed-Action Review Context Summary Trust — `GOVERNED_ACTION_REVIEW_CONTEXT_SUMMARY_TRUST_PASS` — complete.
- Governed-Action Review Context Orientation Trust — `GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_PASS` — complete.
- Enterprise Readiness Foundation — `ENTERPRISE_READINESS_FOUNDATION_PASS` — complete.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS` — complete.
- Phase 5 Governance Foundation — `PHASE5_GOVERNANCE_FOUNDATION_PASS` — complete and dispatched at L0 Advisory / Shadow Only.
- Phase 6 Production Identity, Tenancy & Authorization Foundation — `PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS` — complete and dispatched.
- Phase 7 AI Organization Workspace Foundation — `PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS` — complete and dispatched through design Stage 6.
- Phase 8 Watcher Integration & Stale Archive Preview Foundation — `PHASE8_WATCHER_STALE_PREVIEW_PASS` — complete and dispatched through design Stage 7.

## Phase 8 accepted release

Final unchanged closure candidate: `dbd5765d9d9a8df640ab9654889b9ac6cbed8c9f`.  
Closure merge to `main`: `c2398c9c5e4007fd7fbdc2f31561365cf93e5d58` through issue #385 / PR #386.

Final validation: 20/20 triggered workflows passed, including Phase 8 Watcher Stale Preview Closure Qualification #2 and CI Smoke #957. Final review was clean with no review submissions or review threads.

Accepted Phase 8 capabilities:

1. Deterministic archive stale-state evaluation — PR #376.
2. Watcher review adapter and semantic dedupe — PR #378.
3. Error-bounded integration into the existing watcher — PR #380.
4. Source-fingerprint-bound update/rebuild preview generation — PR #382.
5. Admin stale/rebuild/conflict/manual-review visibility and approval blocking — PR #384.
6. Dedicated Phase 8 closure qualification and release evidence — PR #386.

Phase 8 accepts Stage 7 watcher integration as **review/preview-only**. It does not authorize watcher-driven archive execution, automatic approval, archive overwrite, source delete/move/rename, direct watcher calls into archive execution/sidecar mutation, or broad full-drive watch by default.

Stage 8 AI enrichment improvements and Stage 9 advanced document intelligence remain separately governed future work.

## Phase 7 accepted release

Final unchanged closure candidate: `e613143b58a9d2048b5c1291baa68828881c0512`.  
Closure merge to `main`: `60a16f58321f599ed5f13b0319fbd712ba3e986a` through issue #369 / PR #372.

Final validation: 20/20 triggered workflows passed, including Phase 7 Foundation Closure Qualification #2 and CI Smoke #936. Final review was clean with no review submissions or review threads.

Accepted Phase 7 foundation capabilities:

1. Archive Profile Model and validated local persistence — PR #345.
2. Deterministic preview-only Archive Planner — PR #349.
3. Explicit-approval copy-only Archive Executor with source fingerprint verification and no-overwrite semantics — PR #351.
4. Provenance-rich Metadata Sidecar Writer with sensitive-field exclusion and exclusive-create safety — PR #353.
5. Admin/operator Archive Review Workspace Foundation with conflict visibility, evidence references and approval intent only — PR #358.
6. Foundation Closure Qualification and release evidence — PR #372.

Phase 7 accepts the AI Organization Workspace foundation only through design Stages 2–6. Stage 7 watcher integration, Stage 8 AI enrichment improvements and Stage 9 advanced document intelligence remain separately governed future work.

Phase 7 does not authorize watcher-driven archive writes, automatic approval/execution, source delete/move/rename authority, archive overwrite authority, direct execution from the Admin review workspace, privileged production infrastructure, real production secrets, destructive production migration/cutover, external certification/load commitments, commercial SLA/SLO commitments, or material automatic governance/action/recovery expansion.

## Phase 6 accepted baseline

Final unchanged Phase 6 closure candidate: `6eef85c405a020feb30d239b4c55b26d747f0ccb`.  
Closure merge: `71fd3627b783284bccf37f7628b86a8a78fb3c07` through #338 / PR #339.

Phase 6 remains the accepted provider-neutral production identity/tenancy/authorization foundation. Accepted post-closure evidence maintenance runs through Phase 6.15 merge `92d56c501e82050e6de83aa6d70fccc8e62e3f1c`. Phase 7 does not expand production identity, infrastructure, secrets or automatic-governance authority.

## Current five-track position

| Track | Accepted position | Next decision criterion |
|---|---|---|
| Product & UX | Phase 7 adds the bounded Admin/operator archive review foundation while preserving Client Workspace/Admin separation | Choose the next distinct user-visible value without bypassing review/approval boundaries |
| Knowledge & Safe Action | Copy-first archive planning/execution, evidence provenance, no-overwrite and source preservation are accepted | Advance only through explicit reviewable stages; no hidden mutation authority |
| Enterprise Platform | Phase 6 provider-neutral identity, tenancy and authorization foundations remain accepted | Real production IdP/secrets, privileged infrastructure, destructive cutover, certification/load qualification and SLA commitments remain CEO-gated |
| Engineering Operations | CI/release discipline now includes Phase 7 Foundation Closure Qualification alongside inherited gates | Preserve applicable closure gates and unchanged-head evidence |
| Governance & Autonomous Delivery | Phase 7 Foundation is accepted; Phase 5 governance remains L0 advisory/shadow | Release later stages one bounded dependency at a time; do not infer automatic authority |

## Active dependency rule

```text
Phase 8 accepted through Stage 7
  -> preserve watcher review/preview-only + semantic dedupe + source-fingerprint binding
    -> preserve Phase 7 copy-first + no-overwrite + explicit-approval boundaries
      -> keep Stage 8 AI enrichment improvements separately gated
        -> keep Stage 9 advanced document intelligence separately gated
          -> preserve all Phase 6 production authority restrictions
```

## Next-phase rule

Post-Phase-8 work must be derived from synchronized repository priorities and dependency readiness. Stage 8 AI enrichment may add enrichment controls, a user-disable switch and provenance labeling, but must not add new filesystem mutation authority. Stage 9 advanced document intelligence remains separately gated and requires OCR/layout/table extraction risk review; broad-drive watch remains off by default.

Selection should prioritize material user/customer value, bounded reversible scope, explicit approval, source/evidence provenance, no hidden filesystem mutation, and measurable acceptance criteria.

If the best next dependency requires a material business, architecture, production-infrastructure or authority decision, escalate that exact decision to the CEO. Otherwise bounded work may proceed under its repository-authoritative scope.

## Mandatory inherited release discipline

Every changed release candidate must pass the full applicable inherited matrix on one unchanged head. Historical green evidence is supporting evidence only. Work affecting accepted Phase 8 watcher contracts preserves `EverythingAI Phase 8 Watcher Stale Preview Closure Qualification`; Phase 7 foundation-affecting work preserves `EverythingAI Phase 7 Foundation Closure Qualification`; Phase 6-affecting work preserves `EverythingAI Phase 6 Closure Qualification` unless explicitly superseded by an accepted later decision.

## CEO-gated directions

Explicit CEO authority remains required before privileged-host/root/sudo/SSH/systemd work, real production secrets or identity/device-provider provisioning, destructive production database/object migration or cutover, watcher-driven archive execution or automatic approval, source delete/move/rename or archive overwrite authority, external penetration/compliance/certification commitments, production load/capacity qualification, provider-specific cloud lock-in beyond accepted neutral architecture, material automatic action/recovery/governance authority expansion, broad authorization rollout, or commercial SLA/SLO commitments.

## Rollback

Phase 8 closure merge `c2398c9c5e4007fd7fbdc2f31561365cf93e5d58` and each Phase 8 implementation merge remain independently reversible. Phase 8 canonical synchronization is evidence/documentation-only and can be reverted without changing accepted runtime contracts. Phase 7, Phase 6 and all earlier accepted milestones retain independent rollback evidence.
