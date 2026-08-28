# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-29  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`); Workspace Context Trust & Provenance dispatched (`WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`); Governed-Action Trust & Evidence dispatched (`GOVERNED_ACTION_TRUST_EVIDENCE_PASS`); Governed-Action Review Context dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_PASS`); Governed-Action Review Context Summary Trust dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_SUMMARY_TRUST_PASS`); Governed-Action Review Context Orientation Trust dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_PASS`); Enterprise Readiness Foundation dispatched (`ENTERPRISE_READINESS_FOUNDATION_PASS`)
Current gate: #304 Enterprise Readiness Foundation dispatch complete; select next dependency from synchronized five-track roadmap

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current governance issue.
4. Inspect recent commits, open issues, open PRs, and relevant CI/workflow state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted authority

- Phase 2 — merge `266c2efa255ba11165ffaf5d0b6385affe0f261b` — `PHASE2_PASS`.
- Evidence/Search/Lifecycle/Recovery Comprehension — #198/#199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90` — `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity — #218/#219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298` — `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Workspace Context Trust & Provenance — #230/#231 merge `dac62d9503d0b159d0997c224258e9bdb03a2473` — `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`.
- Governed-Action Trust & Evidence — #246/#247 merge `9927ab9988e4b321619dd4a745af9023855c4d8b` — `GOVERNED_ACTION_TRUST_EVIDENCE_PASS`.
- Governed-Action Review Context — #262/#263 merge `39232ca75ac5e58e2de4fbdc0125de0ef78ba261` — `GOVERNED_ACTION_REVIEW_CONTEXT_PASS`.
- Review Context Summary & Safe Return Map — #266/#267 merge `71f4e9051a0d2aba50108decadf5280264dde771` — strict RED→GREEN; CI #724.
- Review Context Summary Provenance & Unknown-State Explanations — #270/#271 merge `7afeaedf5821422a955b1a244337fe4ca049e026` — strict RED→GREEN; CI #729.
- Review Context Summary Trust synchronization — #272/#273 merge `549fcd7b47e435111a9c46f5bd7fa5412f3ec0e9` — CI #733 plus thirteen focused workflows.
- Review Context Summary Trust release — #274/#275 merge `f996c4e2ff2ce4bbb80c35b0a08efa46f174feed` — candidate CI #735 and changed-final-head CI #736 plus thirteen focused workflows — `GOVERNED_ACTION_REVIEW_CONTEXT_SUMMARY_TRUST_PASS`.
- Review Context Summary Trust post-dispatch synchronization — #276/#277 merge `bdd65c656558e9c715c8346887a156d872dd89f3` — CI #738 plus thirteen focused workflows.
- Review Context Orientation Clarity — #278/#279 merge `b54f74a8c73c69850a2059e3e593b03a39a3ca18` — strict RED→GREEN; final implementation head `ab511573969ca8706b2110fac7e9a7540a9fa91e`; CI #741 plus thirteen inherited focused workflows and Orientation workflow #2.
- Review Context Orientation synchronization — #280/#281 merge `11f85dc090318504792140fb7311e5bc234ba3da` — corrected unchanged head `ac2ce97f431faad8d8557b50f2bb34e38ad48760`; CI #744 plus fourteen focused workflows.
- Review Context Orientation Provenance & Unknown-State Clarity — #282/#283 merge `b718146c92e8a740209ebee3ea99782b88333163` — strict RED→GREEN; final implementation head `e89ac88f071f4d303fc0c5fc5d1914d778ff931d`; CI #747 plus fourteen inherited workflows and Orientation Provenance workflow #2.
- Review Context Orientation provenance synchronization — #284/#285 merge `4c4ea8f0117d8bc201703c77e270c385b2a9f8b1` — unchanged documentation head `bc233a3fca74d9719202dcc8ad24ccc7a170f334`; CI #749 plus fifteen focused workflows.
- Review Context Orientation Trust release — #286/#287 merge `88a5ec01fd87bedc360c7410c7c25bc4dfcce86b` — fresh candidate `b02880c12127123a74207e073362c9be14f716a1` passed CI #751 plus all fifteen focused workflows; changed final decision head `41f2195052df9fb1273ab8a133727e85cbcd4184` passed CI #753 plus all fifteen focused workflows; final review clean — `GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_PASS`.

## Current release authority evidence

### Phase 3 Enterprise Readiness Foundation

Latest release decision: `docs/ENTERPRISE_READINESS_FOUNDATION_RELEASE_DECISION_2026-08-29.md`  
Latest handover: `docs/HANDOVER_2026-08-29_ENTERPRISE_READINESS_FOUNDATION_RELEASE.json`

`ENTERPRISE_READINESS_FOUNDATION_PASS` is authoritative for the bounded application-level foundation through Phase 3.1–3.6 plus #305/#306 dependency-security remediation. It does not claim production deployment, destructive cutover, production secret provisioning, external certification, production-load qualification, or commercial SLA readiness.

Prior Review Context Orientation Trust release authority remains valid historical evidence through #286/#287; its release decision and handover remain preserved, but it is no longer the latest release authority.

The prior Review Context Summary Trust release decision and handover remain valid historical release authority:

- `docs/GOVERNED_ACTION_REVIEW_CONTEXT_SUMMARY_TRUST_RELEASE_DECISION_2026-08-27.md`;
- `docs/HANDOVER_2026-08-27_GOVERNED_ACTION_REVIEW_CONTEXT_SUMMARY_TRUST_RELEASE.json`.

## Program tracks

Maintain five separate tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently treat Enterprise Platform, privileged-host work, or material runtime expansion as authorized by Product & UX progress.

## Roles

- **CEO / Product Owner:** final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing decisions.
- **ChatGPT:** PM/release authority; architecture/dependency ordering; acceptance/rejection; authorized direct implementation of bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

Implementation and acceptance evidence remain distinct. No executor may invent or self-certify missing evidence.

## Execution lifecycle

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → improve → retest → independent diff review → accept/reject → merge/close → release next dependency`

Rules:

- exactly one dependency-satisfied implementation task per queue;
- smallest coherent reversible change;
- no destructive Git operations or history rewriting;
- preserve unrelated changes;
- no broad refactor without approved scope;
- no PASS without independently reviewable evidence;
- truthful BLOCKED outcomes are valid;
- every accepted milestone records exact commit/merge, validation, risks, and rollback;
- accepted focused workflows remain wired into the inherited baseline unless explicitly superseded.

## Mandatory inherited product regression baseline

For subsequent product/release work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth/Product & UX gates: root regression; backend tests; frontend typecheck/build; Client/Admin smoke; all accepted citation/search/navigation/lifecycle/recovery/planning/execution/audit/undo acceptance; disposable-folder RC; UI-governed planning → preview → approval → execution → audit → undo; independent final review; and milestone-scoped rollback evidence.

The focused workflow baseline remains **fifteen mandatory workflows**:

1. `EverythingAI Source Recovery Return Context`;
2. `EverythingAI Multi-hop Return Context`;
3. `EverythingAI Return Context Provenance`;
4. `EverythingAI Workspace Context Summary`;
5. `EverythingAI Workspace Context Provenance`;
6. `EverythingAI Context-Aware Task Resumption`;
7. `EverythingAI Governed-Action Comprehension`;
8. `EverythingAI Governed-Action Evidence Navigation`;
9. `EverythingAI Governed-Action Evidence Filtering`;
10. `EverythingAI Governed-Action Review Resumption`;
11. `EverythingAI Governed-Action Review Context Provenance`;
12. `EverythingAI Governed-Action Review Context Summary`;
13. `EverythingAI Governed-Action Review Context Summary Provenance`;
14. `EverythingAI Governed-Action Review Context Orientation`;
15. `EverythingAI Governed-Action Review Context Orientation Provenance`.

Historical green evidence never substitutes for validating a changed candidate. CI/focused-workflow wiring is part of the accepted baseline.

## Accepted safety boundaries

- authoritative backend-returned search, execution, audit, and persisted action states are preserved;
- preview remains proposal-only; ready state requires explicit execution approval; blocked reasons remain backend-authoritative;
- executed, failed, and undone remain distinct persisted states;
- evidence navigation/filtering/review resumption/provenance/clearing/summary/summary-provenance/orientation/orientation-provenance use already-loaded state and must not trigger backend queries merely to manufacture or reconstruct context;
- “without loaded audit evidence” is scoped only to the current loaded audit window and never proves global absence;
- review resumption preserves only the exact remembered execution and becomes unavailable when that execution is absent from the current loaded review window;
- no replacement execution is inferred or auto-selected;
- review-context provenance may identify only genuine local navigation origin and must not imply backend persistence or review completion;
- Review Context Summary may expose only genuinely known loaded-state facts: remembered execution, loaded-evidence availability, local origin, active loaded-window filter scope, and genuine safe return/resume target;
- summary provenance may identify only the genuine loaded/local source of each displayed fact and may explain unknown state only from missing/stale loaded facts;
- Review Context Orientation may distinguish current loaded-window state from remembered local review context only from already-loaded/local facts and must not imply backend persistence, global audit completeness, review completion, or a replacement execution;
- orientation provenance may identify only the genuine already-loaded/local origin of displayed orientation facts and may explain unknown state only from missing/stale loaded facts;
- unavailable summary/orientation fields remain unknown rather than inferred; no backend fetch may be added merely to fill or reconstruct them;
- explicit context clearing removes only remembered local navigation context and triggers no backend/action/recovery/filesystem mutation;
- no new backend/API/schema/persistence/routing architecture, action scope, automatic approval/execution/retry/recovery/undo, or filesystem mutation is authorized;
- stale/missing context remains unknown or unavailable rather than inferred.

## Current governance gate

Phase 3 Enterprise Readiness Foundation is dispatched as `ENTERPRISE_READINESS_FOUNDATION_PASS` through #304. Final dependency-remediation head `5cc3ffe0f8842ea2250ddb986d9cb86444e3df2a` passed CI Smoke #836, all fifteen inherited focused workflows, all six Phase 3 enterprise workflows, and Dependency Security Audit #8. Select the next bounded dependency from the synchronized five-track roadmap.


## CEO-gated directions

ER-1 through ER-5 are approved architecture authority. Additional CEO approval remains required before material production-platform execution beyond the accepted foundation, including privileged-host/root/sudo/SSH/systemd work, real production secrets or identity-provider provisioning, destructive database/object migration or cutover, external penetration/compliance/certification commitments, production load/capacity qualification, cloud-provider lock-in decisions beyond the provider-neutral architecture, or commercial SLA/SLO commitments.


## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. The #304 Enterprise Readiness Foundation release/canonical synchronization is documentation/governance-only and is independently reversible from the Phase 3 runtime implementation merges. Review Context Orientation Trust release merge `88a5ec01fd87bedc360c7410c7c25bc4dfcce86b`, Review Context Orientation provenance synchronization merge `4c4ea8f0117d8bc201703c77e270c385b2a9f8b1`, Review Context Orientation Provenance merge `b718146c92e8a740209ebee3ea99782b88333163`, Review Context Orientation synchronization merge `11f85dc090318504792140fb7311e5bc234ba3da`, Review Context Orientation merge `b54f74a8c73c69850a2059e3e593b03a39a3ca18`, post-dispatch synchronization merge `bdd65c656558e9c715c8346887a156d872dd89f3`, release merge `f996c4e2ff2ce4bbb80c35b0a08efa46f174feed`, synchronization merge `549fcd7b47e435111a9c46f5bd7fa5412f3ec0e9`, runtime milestone merges `7afeaedf5821422a955b1a244337fe4ca049e026` and `71f4e9051a0d2aba50108decadf5280264dde771`, and all earlier accepted rollback evidence remain valid.
