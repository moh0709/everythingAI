# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-26  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity dispatched (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`); Workspace Context Trust & Provenance dispatched (`WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`); Governed-Action Trust & Evidence dispatched (`GOVERNED_ACTION_TRUST_EVIDENCE_PASS`); Governed-Action Review Context dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_PASS`); Review Context Summary #266 and Summary Provenance #270 accepted  
Current gate: issue #272 canonical synchronization and Review Context Summary Trust release-gate preparation

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
- Trustworthy Search — #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883` — final CI #535.
- Governed-Action Lifecycle — #162/#163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` — final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension — #198/#199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90` — `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity — #218/#219 merge `6cbb3c15de8cb5e9624c5fb164a2781790336298` — `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Workspace Context Trust & Provenance — #230/#231 merge `dac62d9503d0b159d0997c224258e9bdb03a2473` — `WORKSPACE_CONTEXT_TRUST_PROVENANCE_PASS`.
- Governed-Action Trust & Evidence — #246/#247 merge `9927ab9988e4b321619dd4a745af9023855c4d8b` — `GOVERNED_ACTION_TRUST_EVIDENCE_PASS`.
- Governed-Action Review Context — #262/#263 merge `39232ca75ac5e58e2de4fbdc0125de0ef78ba261` — `GOVERNED_ACTION_REVIEW_CONTEXT_PASS`.
- Post-dispatch synchronization — #264/#265 merge `5321b5dc0b1f49554faa75fb6b29d665dd8cbbff` — CI #721 plus eleven focused workflows.
- Governed-Action Review Context Summary & Safe Return Map — #266/#267 merge `71f4e9051a0d2aba50108decadf5280264dde771` — strict RED→GREEN; final unchanged head `ff0cb0602aacaff4cdd776f65209f811b84d94fd`; CI #724; Summary workflow #2; final review clean.
- Review Context Summary synchronization — #268/#269 merge `f6c67a0bc53c7c888eaf9476ae5575b19e2ea996` — CI #726 plus twelve focused workflows; final documentation review clean.
- Governed-Action Review Context Summary Provenance & Unknown-State Explanations — #270/#271 merge `7afeaedf5821422a955b1a244337fe4ca049e026` — strict RED→GREEN; RED head `72cf0d358ea5361f9f27c08e98b494e6df63ec05`; final unchanged head `c8a6e7b4cdcd5e811803a0b348ca276f9291f07e`; CI #729; Summary Provenance workflow #2; final review clean.

## Current release authority evidence

Release decision: `docs/GOVERNED_ACTION_REVIEW_CONTEXT_RELEASE_DECISION_2026-08-26.md`  
Handover: `docs/HANDOVER_2026-08-26_GOVERNED_ACTION_REVIEW_CONTEXT_RELEASE.json`

The dispatched Governed-Action Review Context tranche remains authoritative. #266 and #270 are later bounded accepted Product & UX continuations and do not alter that release status until a separate release gate is accepted.

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

The focused workflow baseline is now **thirteen mandatory workflows**:

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
13. `EverythingAI Governed-Action Review Context Summary Provenance`.

Historical green evidence never substitutes for validating a changed candidate. CI/focused-workflow wiring is part of the accepted baseline.

## Accepted safety boundaries

- authoritative backend-returned search, execution, audit, and persisted action states are preserved;
- preview remains proposal-only; ready state requires explicit execution approval; blocked reasons remain backend-authoritative;
- executed, failed, and undone remain distinct persisted states;
- evidence navigation/filtering/review resumption/provenance/clearing/summary/summary-provenance use already-loaded state and must not trigger backend queries merely to manufacture or reconstruct context;
- “without loaded audit evidence” is scoped only to the current loaded audit window and never proves global absence;
- review resumption preserves only the exact remembered execution and becomes unavailable when that execution is absent from the current loaded review window;
- no replacement execution is inferred or auto-selected;
- review-context provenance may identify only genuine local navigation origin and must not imply backend persistence or review completion;
- Review Context Summary may expose only genuinely known loaded-state facts: remembered execution, loaded-evidence availability, local origin, active loaded-window filter scope, and genuine safe return/resume target;
- summary provenance may identify only the genuine loaded/local source of each displayed fact and may explain unknown state only from missing/stale loaded facts;
- unavailable summary fields remain unknown rather than inferred; no backend fetch may be added merely to fill the summary or its provenance;
- explicit context clearing removes only remembered local navigation context and triggers no backend/action/recovery/filesystem mutation;
- no new backend/API/schema/persistence/routing architecture, action scope, automatic approval/execution/retry/recovery/undo, or filesystem mutation is authorized;
- stale/missing context remains unknown or unavailable rather than inferred.

## Current governance gate

Issue #272 is documentation-only synchronization after accepted #270/#271.

It must record exact #270 evidence, expand the focused baseline from twelve to thirteen without removing any inherited workflow, preserve rollback/safety semantics, and pass full inherited CI plus all thirteen focused workflows on one unchanged documentation head before merge.

The accepted #266 + #270 sequence is coherent and bounded enough for a dedicated release/dispatch evaluation:

- #266 supplies the read-only Review Context Summary & Safe Return Map;
- #270 supplies truthful provenance and unknown-state explanations for that same summary;
- both use already-loaded state and preserve loaded-window truthfulness, exact-target review semantics, no inferred replacement execution, and no backend fetch merely to manufacture context;
- both remain independently reversible.

If #272 is accepted, the next dependency-safe step is a separate **Governed-Action Review Context Summary Trust release/dispatch evaluation gate**. No additional implementation feature is authorized by this synchronization.

## CEO-gated directions

Explicit CEO approval remains required before authentication/tenancy, cloud deployment, DB migration/object storage, privileged-host/systemd work, production-platform architecture execution, new routing architecture, automatic action/recovery/rebuild behavior, material connector/runtime expansion, new backend/API/schema/persistence expansion, or new semantic/provider architecture with material runtime/cost/trust implications.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #272 is documentation-only and can be reverted independently. #270 merge `7afeaedf5821422a955b1a244337fe4ca049e026`, #268 synchronization merge `f6c67a0bc53c7c888eaf9476ae5575b19e2ea996`, #266 merge `71f4e9051a0d2aba50108decadf5280264dde771`, #264 synchronization merge `5321b5dc0b1f49554faa75fb6b29d665dd8cbbff`, #262 release merge `39232ca75ac5e58e2de4fbdc0125de0ef78ba261`, #260 synchronization merge `98c531545c058aa9f5f2882ff25c6d7045b5d810`, #258 merge `bdfa7f24d86e81153c742c8bc5dc53fd906d3c07`, #254 merge `ec96edf5bf9be64df9feab4c05fcd0188bbe60da`, #250 merge `437a882ed1a2af55db5af89e68654fd1ea8e14af`, #246 release merge `9927ab9988e4b321619dd4a745af9023855c4d8b`, and all earlier accepted rollback evidence remain valid.
