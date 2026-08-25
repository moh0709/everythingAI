# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-25  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth comprehension dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`); Cross-Surface Context Continuity accepted through #210  
Current gate: issue #212 canonical synchronization and next bounded continuity decision gate

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover and current decision gate.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, exhaust repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current accepted release evidence

- Phase 2 release: `266c2efa255ba11165ffaf5d0b6385affe0f261b` (`PHASE2_PASS`).
- Trustworthy-search release: #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`, final CI #535.
- Governed-action lifecycle release: #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2`, final CI #568.
- Evidence/Search/Lifecycle/Recovery Comprehension release: #198 / PR #199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`, status `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Comprehension post-sync release candidate: `de8302a281badff75d8408fdcba1fbc15f9916ca`, CI #624 PASS.
- Comprehension release-decision head: `94d303c8e687f01f4f8f1e4216ac2357cea0beb7`, CI #625 PASS, final documentation review clean.
- Cross-Surface Context Continuity #202 / PR #203: merge `698d07aea66d00fbdf65c94eeacc1f15240fd4c2`; unchanged-head `d63cdb84c836e882d3734c6aeade98a5010043fc`; CI #629 PASS; final PM review clean.
- Source-to-Recovery Return Context #206 / PR #207: merge `21325da2ffb41899047b200d8e71877d022033b0`; focused workflow `EverythingAI Source Recovery Return Context` PASS on unchanged head `deb06e7055d57cf6feeb49e97222750f838f1a10`; full CI #634 PASS on the same head; final PM review clean.
- Multi-Hop Return Context #210 / PR #211: merge `a4cc1fd89ea34a397d8537a8050ff68f56423d35`; unchanged head `968fab6f50c9a4b09262cb203fa0a2947809edd6`; CI #641 PASS; both focused workflows `EverythingAI Source Recovery Return Context` and `EverythingAI Multi-hop Return Context` PASS; final independent diff review clean.
- Release decision: `docs/PRODUCT_DEPTH_COMPREHENSION_RELEASE_DECISION_2026-08-25.md`.
- Handover: `docs/HANDOVER_2026-08-25_PRODUCT_DEPTH_COMPREHENSION_RELEASE.json`.

## Program tracks

Maintain five separately named tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently treat Enterprise Platform or privileged-host work as authorized by Product Depth progress.

## Roles

- **CEO / Product Owner:** final business, strategic, commercial, materially architectural, security/legal, and materially scope-changing decisions.
- **ChatGPT:** PM/release authority; architecture/dependency ordering; acceptance/rejection; authorized direct implementation of bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

Implementation and acceptance evidence must remain distinguishable. No executor may invent or self-certify missing evidence.

## Execution lifecycle

Use this loop:

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
- previously accepted focused browser gates must remain wired into CI unless explicitly superseded by an accepted decision.

## Mandatory inherited product regression baseline

For subsequent product/release work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth gates:

- root regression;
- backend tests;
- frontend typecheck;
- frontend production build;
- Client/Admin Playwright smoke;
- rich-citation/source-highlighting acceptance;
- long-form/table rendering acceptance;
- grouped-planning/bulk-selection acceptance;
- API-key lifecycle acceptance;
- explainable unified-search acceptance;
- contextual-search-snippet acceptance;
- Knowledge Base search-navigation acceptance;
- source-inspection-navigation acceptance;
- trust-diagnostics-navigation acceptance;
- planning-selection-clarity acceptance;
- planning-preview-decision-clarity acceptance;
- execution/audit/undo outcome-clarity acceptance;
- knowledge-evidence/freshness-guidance acceptance;
- search-refinement/filtering acceptance;
- search-refinement lifecycle/query-context acceptance;
- lifecycle-status refinement/processing-state acceptance;
- selected-source lifecycle guidance acceptance;
- source-root recovery-context acceptance;
- recovery-outcome guidance acceptance including exact-root, mismatched-root, no-configured-root, and missing-evidence scenarios;
- cross-surface context-continuity acceptance;
- focused source-to-recovery return-context workflow acceptance;
- focused multi-hop return-context workflow acceptance;
- complete inherited CI matrix validation on the same unchanged candidate as both focused gates;
- disposable-folder RC acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent final review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Historical green evidence never substitutes for validating a new candidate. CI wiring for accepted focused gates is part of the baseline.

## Accepted Product Depth safety boundaries

Product Depth may improve existing local-first Client comprehension and inspection, but must preserve:

- backend-returned search order and existing match facts;
- source provenance and citation evidence;
- no presentation of ranking signals as calibrated confidence;
- no frontend invention of progress, completion, freshness, trust, retry, recovery success, or mutation facts;
- existing lifecycle semantics for indexing/extraction state;
- selected-source guidance derived only from accepted persisted lifecycle facts;
- source-root recovery as the only currently exposed recovery path for supported failure states;
- recovery-context inspection as read-only until the user explicitly invokes an existing control;
- persisted `indexed`, `skipped`, and `failed` scan outcomes remain semantically distinct;
- watcher state is monitoring evidence only, never recovery/extraction/Knowledge Base success;
- configured recovery-root identity comes only from Folder Path;
- scan/watcher root identities remain evidence-only and are applicable to the configured root only on exact match;
- if no Folder Path is configured, configured-root identity remains unknown even when persisted evidence exists;
- mismatched persisted evidence may remain visible only when explicitly scoped to its recorded root;
- no per-file retry;
- governed planning, approval, audit, undo, and filesystem safety boundaries.

Accepted Cross-Surface Context Continuity additionally preserves:

- genuine Knowledge Base origin identity when opening source inspection;
- the current search query where genuine source context is opened;
- explicit return navigation only to recorded origin context;
- no fabricated Knowledge Base return context from direct Sources & Files navigation;
- source-to-recovery navigation may remember only the genuine selected source and current query;
- that selected source is navigation origin only, never recovery scope;
- recovery remains source-root scoped;
- return restores the same source only if it still exists and never selects a substitute when missing;
- direct Home/recovery navigation clears prior source-origin context;
- multi-hop return context may carry only genuine recorded origins across Knowledge Base → Source Inspection → Recovery → Source Inspection → Knowledge Base;
- stale selected-source IDs never fall back to another file, and stale document context is cleared when refresh proves the source no longer exists;
- missing/stale page or source context remains unavailable/unknown rather than inferred;
- existing Client Workspace identifiers/state only unless a separately approved gate proves a minimal contract is required.

No authentication, tenancy, cloud deployment, database migration, object storage, privileged-host/systemd, automatic mutation/recovery/rebuild, or material connector/runtime expansion is authorized.

## Current bounded direction gate

Issue #212 is the sole active governance task. It synchronizes accepted #210 evidence and prepares exactly one next bounded Cross-Surface Context Continuity option.

After #212 acceptance, the next implementation issue should target **return-context provenance visibility and explicit context clearing** across existing Client Workspace surfaces. It may expose only genuinely recorded navigation origins, must clearly distinguish navigation context from recovery/action scope, must allow the user to explicitly clear remembered return context, must keep missing history unknown rather than reconstruct it, remain frontend/local-first, and pass the complete inherited regression matrix plus both focused return-context workflows.

CEO-gated directions remain Enterprise Platform expansion, privileged-host/systemd work, auth/tenancy/cloud/database/object-storage work, or material connector/runtime expansion.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback discipline

Every accepted milestone remains independently reversible by its recorded merge. #212 is documentation-only and can be reverted independently from product/runtime code.
