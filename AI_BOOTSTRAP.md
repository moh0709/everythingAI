# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-08-24  
Current accepted state: Phase 2 dispatched (`PHASE2_PASS`); Product Depth trustworthy-search release plus #144/#146/#150/#154/#158 accepted  
Current gate: issue #160 canonical synchronization

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read the newest accepted release decision/handover.
4. Inspect recent commits, open issues, open PRs, and relevant CI state.
5. Confirm the next work is dependency-satisfied and within already approved scope.
6. Define acceptance criteria, evidence, validation, and rollback before implementation.

If a source lookup fails, use available repository/file fallbacks before declaring a blocker. Verify tool capabilities before claiming an action is unavailable.

## Current program model

Maintain five separately named tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Phase 2 is complete and dispatched at merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`. The bounded Product Depth trustworthy-search sequence was dispatched through #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883` after final unchanged-head CI #535 and independent diff review. Product Depth continuation milestones #144, #146, #148, #150, #152, #154, #156, and #158 are accepted. #156 merged as `d8152d2307b63917e5580d01690119b24c88ccf0` after CI #557. #158 merged as `b75e236960ec5f0e562bfbfb06f1954d47efafe2` after CI Smoke #562 and independent final diff review with no unresolved Critical or Important findings.

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
- every accepted milestone records exact commit/merge, validation, risks, and rollback.

## Mandatory inherited product regression baseline

For subsequent product work, preserve all applicable accepted Phase 1 + Phase 2 + Product Depth gates:

- root regression;
- backend tests;
- frontend typecheck;
- frontend production build;
- Client/Admin Playwright smoke;
- rich-citation/source-highlighting acceptance;
- long-form/table rendering acceptance;
- grouped-planning/bulk-selection acceptance;
- API-key lifecycle acceptance;
- Product Depth explainable unified-search acceptance;
- Product Depth contextual-snippet acceptance;
- Product Depth Knowledge Base search-navigation acceptance;
- Product Depth source-inspection-navigation acceptance;
- Product Depth trust-diagnostics-navigation acceptance;
- Product Depth planning-selection-clarity acceptance;
- Product Depth planning-preview-decision-clarity acceptance;
- Product Depth execution/audit/undo outcome-clarity acceptance;
- disposable-folder release-candidate acceptance;
- UI-governed planning → preview → approval → execution → audit → undo acceptance;
- independent diff review with no unresolved Critical or Important findings;
- milestone-scoped rollback evidence.

Tests passing on an older commit do not prove a new candidate.

## Product Depth trust and planning constraints

The accepted Product Depth sequence must preserve these properties:

- Client search and diagnostics remain read-only;
- keyword/semantic match basis is explained truthfully;
- semantic similarity is a ranking signal, not calibrated confidence;
- the local Knowledge Base heuristic score is not shown as user-facing relevance/confidence;
- snippets use real indexed/saved content and do not invent evidence;
- literal highlighting respects Unicode letter/number term boundaries;
- exact saved-page navigation and source provenance remain intact;
- source inspection moves only among genuine persisted chunks and does not alter pinned citation identity;
- trust diagnostics use exact persisted `page_id` navigation when available and do not recalculate backend trust values;
- planning-selection UI may explain included, unselected, blocked, and conflicting suggestions, but must not weaken backend policy, approval requirements, confidence enforcement, or the global one-filesystem-mutation-per-file guard;
- planning-preview UI may explain ready and blocked previews, backend-provided reasons, source/target impact, and the dry-run/approval boundary, but must preserve existing preview and execution semantics;
- execution/audit/undo UI may clarify existing persisted outcome facts, but must not imply filesystem restoration solely from an `undone` persisted state or change execution, audit, mutation, or undo semantics.

## Current scope gates

No new major implementation phase is authorized by Phase 2 or Product Depth completion alone.

Explicit CEO approval remains required before authentication/identity architecture, production tenancy/workspaces, cloud deployment, production database/storage, privileged-host/systemd work, material connector/runtime expansion, or other material architecture/commercial-scope expansion.

Bounded documentation reconciliation, QA, evidence synchronization, and Product Depth work already within the approved direction may proceed autonomously.

## Issue #69

Issue #69 is closed completed historical evidence. Read it when relevant, but do not rewrite its historical acceptance record unless a newly discovered factual inconsistency requires explicit CEO review.

## Current task

Issue #160 is the sole active Product Depth governance task. Synchronize canonical state after accepted #156/#158 without changing runtime behavior.

After #160 acceptance, release the bounded **Product Depth governed-action lifecycle release decision**. That gate evaluates the already accepted planning-selection (#150), preview-decision (#154), and execution/audit/undo outcome-clarity (#158) milestones as one lifecycle. It is an evidence/release gate, not authorization for new runtime behavior.

## Evidence authority

Current Phase 2 release evidence:

- `docs/PHASE2_RELEASE_DECISION_2026-08-23.md`
- `docs/HANDOVER_2026-08-23_PHASE2_RELEASE_DECISION.json`
- merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`

Accepted Product Depth trustworthy-search release evidence:

- `docs/PRODUCT_DEPTH_SEARCH_RELEASE_DECISION_2026-08-24.md`
- `docs/HANDOVER_2026-08-24_PRODUCT_DEPTH_SEARCH_RELEASE.json`
- #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883`
- final unchanged-head CI #535

Accepted Product Depth continuation evidence:

- #144 merge `9c707581c1c8d068724925854008309ab7cc251e` — CI #539
- #146 merge `453b7d009060db44918f6c4d5346d197323cdf15` — final PR-head CI #541
- #148 merge `f496cf86e733501bc4bb0a5a90af4a1ec3e8678b` — CI #543
- #150 merge `6bdb96f08cab2f1597528223d2f19a2ee1d0f3f5` — CI #546
- #152 merge `2f8d2bf0700d3d07e97e38e1f51bffb806886dbd` — CI #548
- #154 merge `943aff2e9807894142581c4f6872b76188e26d5f` — CI #555
- #156 merge `d8152d2307b63917e5580d01690119b24c88ccf0` — CI #557
- #158 merge `b75e236960ec5f0e562bfbfb06f1954d47efafe2` — CI Smoke #562

Historical pre-reconciliation bootstrap is preserved exactly at:

`docs/archive/2026-08-23-pre-phase2-reconciliation/AI_BOOTSTRAP.md`

The archive remains evidence, not current operating authority.
