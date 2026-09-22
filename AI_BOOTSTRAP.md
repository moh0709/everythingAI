# EverythingAI — AI Bootstrap and Operating Governance

Date: 2026-09-22  
Current accepted state: Phase 12 Structured Extractor Candidate Qualification is active through Phase 12.2. The accepted Phase 11 model/provider-free, local-first, read-only foundation remains authoritative, and no real extractor runtime is authorized yet.

## Mandatory startup sequence

Before any project-state decision or implementation:

1. Read `PROJECT_STATE.md`.
2. Read this `AI_BOOTSTRAP.md`.
3. Read `docs/ROADMAP.md` and `docs/IMPLEMENTATION_ROADMAP.md`.
4. Read the newest accepted release decision/handover relevant to the active phase.
5. Inspect current GitHub commits, open issues/PRs and relevant CI state.
6. Confirm the next work is dependency-satisfied and within approved authority.
7. Define acceptance criteria, evidence, validation and rollback before implementation.

Repository state, exact SHAs, issue/PR state, workflow evidence and canonical authority files are the source of truth. Do not trust a handover blindly.

## Active Phase 12 authority

Phase 12 is accepted only through its evidence/diagnostic foundation:

- Phase 12.1 Benchmark Corpus / Scoring Foundation — PR #432 merge `37196a5659cec23ffca05fbae5789ce41ca96d77`.
- Phase 12.2 Candidate Result Import / Neutral Diagnostics — PR #434 merge `0084d851b32e9fde5a9f2c1ce41d0fc9fd86cc2d`.
- Phase 12.3 is issue #435, an explicit CEO decision gate for real local extractor benchmarking.

No real OCR/model/provider runtime, dependency installation, model download, Python sidecar, child process, remote processing, schema migration, filesystem/archive mutation, production route activation or provider selection is authorized by the accepted Phase 12 evidence.

## Accepted Phase 11 release authority

Phase 11 Structured Document Intelligence 1.0 Foundation is accepted through:

- parent issue #413;
- closure issue #425 / PR #427;
- unchanged closure candidate `1949e36360b2923ee8b8512dad332638a5a098e4`;
- closure merge `f137941e0ac9416d9a19688c324a87ebf14409a3`;
- `docs/PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_RELEASE_DECISION_2026-09-21.md`;
- `docs/HANDOVER_2026-09-21_PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION.json`.

Final closure evidence: **20/20 triggered workflows passed**, including Phase 11 Structured Document Intelligence Foundation Qualification #1 and CI Smoke #996, with no review submissions or review threads.

## Phase 11 runtime authority boundary

Accepted capability includes:

- provider-neutral structured extraction contract and deterministic evidence IDs;
- source-fingerprint-bound static native/OCR-labeled/table fixtures without actual OCR/model execution;
- local-only/read-only adapter protocol with no hidden fallback;
- compatibility projection to legacy plain text;
- opt-in shadow comparison beside the current extraction path;
- deterministic fixture qualification and operator diagnostics.

Node remains authoritative. Legacy `extracted_text`, search and Wiki extraction remain persistence/search authority.

Phase 11 does **not** activate real OCR/model extraction, Python sidecars, child-process document intelligence, Docling/PaddleOCR/Tesseract/PyMuPDF dependencies, remote processing, structured-result persistence/schema migration, filesystem mutation, archive execution/approval, overwrite or source mutation.

## Accepted Phase 10 research authority

Phase 10 remains accepted as `PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS`. Its research reports remain historical architecture/risk authority. Phase 11 advances only the model/provider-free protocol/fixture/shadow foundation recommended by that research.
## Phase 10 research authority boundary

## Phase 10 research authority boundary

Accepted Phase 10 authority covers research and architecture evidence only:

- current extraction capability/gap inventory;
- structured evidence/provenance contract;
- source-fingerprint and OCR/native-text arbitration requirements;
- implementation options, dependency and licensing risk analysis;
- advisory recommendation for an isolated local adapter with the Node API authoritative.

Advanced document-intelligence runtime remains **unimplemented**. No OCR/model runtime, Python sidecar, Docling/PaddleOCR/Tesseract/PyMuPDF dependency activation, remote processing, schema migration, filesystem mutation, automatic approval/execution, archive overwrite, source mutation, privileged production infrastructure, certification or SLA/SLO authority is granted.

Recommended next bounded implementation: **Structured Document Intelligence 1.0 — model-free fixture validator and local adapter protocol**. It requires no model/provider dependency and has read-only protocol authority.

## Accepted Phase 9 authority

Phase 9 AI Metadata Enrichment Controls Foundation remains accepted as `PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS` through unchanged closure candidate `14e32cbbb5cd154301a52f4bc86dcdd4e71ce331`, closure merge `d8cf36b3959d97efdd2b7689923cb94239a38e48`, and canonical synchronization merge `f19e4acead1f6eb6a4e2989e6c2984a99b323127`. Its provider-neutral enrichment, user-disable and provenance boundaries remain inherited.

## Accepted Phase 8 authority

Phase 8 Watcher Integration & Stale Archive Preview Foundation remains accepted as `PHASE8_WATCHER_STALE_PREVIEW_PASS` through closure merge `c2398c9c5e4007fd7fbdc2f31561365cf93e5d58` and canonical synchronization merge `01f56476d76d8002793347d6868fe9f1e5ae0854`. Its watcher review/preview-only and no-execution boundaries remain inherited by Phase 9.

## Accepted Phase 7 authority

Phase 7 AI Organization Workspace Foundation remains accepted as `PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS` through closure merge `60a16f58321f599ed5f13b0319fbd712ba3e986a`. Its copy-first, no-overwrite, source-preserving and explicit-approval boundaries remain inherited by Phase 9.

## Accepted Phase 7 chain

- Phase 7.1 — Archive Profile Model — PR #345 merge `c9b654be42b72a5f44b3972c37733802614791bc`.
- Phase 7.2 — Preview-only Archive Planner — PR #349 merge `c53f2cde8692e11bbc9c00542767a8188f5efd10`.
- Phase 7.3 — Copy-only Archive Executor — PR #351 merge `40fc5ac13c6311f78146d0b9e9ab812fd62757ef`.
- Phase 7.4 — Metadata Sidecar Writer — PR #353 merge `3662d8eb48f77bf071b625cf380a378b482cf8c2`.
- Phase 7.5 — Admin Archive Review Workspace — PR #358 merge `01c2901882c36885979e077e584701f28e381ff2`.
- Phase 7.6 — Foundation Closure Qualification — PR #372 merge `60a16f58321f599ed5f13b0319fbd712ba3e986a`.

## Accepted Phase 6 authority

Phase 6 Production Identity, Tenancy & Authorization Foundation remains accepted as `PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS` through closure merge `71fd3627b783284bccf37f7628b86a8a78fb3c07` and accepted post-closure evidence maintenance through Phase 6.15 merge `92d56c501e82050e6de83aa6d70fccc8e62e3f1c`.

Accepted Phase 6 foundations include provider-neutral authenticated principals, tenant/workspace membership, normalized roles/permissions, exact resource-scope isolation, representative `documents.read` enforcement, optional device identity, trusted audit attribution and integrated fail-closed/local compatibility qualification.

## Production and governance authority boundary

The following remain separately CEO-gated:

- production IdP/device credential or secret provisioning;
- certificates/key material provisioning;
- privileged root/sudo/SSH/systemd operations;
- destructive production database/object-store migration or cutover;
- broad route-by-route authorization rollout beyond accepted representative enforcement;
- watcher-driven archive execution or automatic approval;
- source delete/move/rename or archive overwrite authority;
- external certification/compliance commitments;
- production load qualification or commercial SLA/SLO commitments;
- provider lock-in;
- material automatic action/recovery/governance authority expansion.

Phase 5 remains **L0 Advisory / Shadow Only**. Later accepted phases do not silently activate Phase 5 governance enforcement.

## Accepted predecessor authority

- Phase 6 — `PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS`.
- Phase 5 Governance Foundation — `PHASE5_GOVERNANCE_FOUNDATION_PASS`, merge `ddb9ed95422ca9bd4be9641a51fa16502aadd80e`.
- Phase 5.1 Governance Continuity — merge `2f8285c140936185bbe75b943b1dcf1acf28e16b`.
- Phase 4 Pre-production Recovery Qualification — `PHASE4_PREPRODUCTION_RECOVERY_QUALIFICATION_PASS`.
- Phase 3 Enterprise Readiness Foundation — `ENTERPRISE_READINESS_FOUNDATION_PASS`.
- Phase 2 and later accepted Product Depth/Product & UX trust milestones remain accepted historical authority.

## Program tracks

Maintain five separate tracks:

1. Product and UX.
2. Knowledge and Safe Action.
3. Enterprise Platform.
4. Engineering Operations.
5. Governance and Autonomous Delivery.

Do not silently convert progress in one track into authority in another.

## Roles

- **CEO / Product Owner:** final authority for material business, strategic, architectural, security/legal and materially scope-changing decisions.
- **ChatGPT:** CTO/PM/release gatekeeper and engineering executor for bounded dependency-satisfied work within approved scope.
- **Forge:** optional executor only when explicitly released.
- **Hermes:** explicitly assigned non-overlapping operational/infrastructure work only.
- **Human operator:** privileged SSH/root/sudo and secret-provisioning work that safe automation cannot perform.

## Execution lifecycle

`inspect → acceptance matrix → implement narrowly → test/CI → evaluate → fix → retest → independent diff/security/governance review → accept/reject → merge/close → canonical verification → next dependency`

Rules:

- smallest coherent reversible change;
- preserve unrelated changes and historical evidence;
- no broad refactor without approved scope;
- no PASS while CI is pending;
- every final release decision refers to one unchanged candidate head;
- no unresolved Critical/Important findings or review threads at merge;
- truthful BLOCKED/REJECTED outcomes are valid;
- preserve explicit rollback boundaries;
- accepted focused workflows remain inherited unless explicitly superseded.

## Mandatory inherited validation

Historical green evidence never substitutes for revalidating a changed candidate. Preserve the complete applicable inherited matrix. Work affecting accepted Phase 11 structured-document contracts or canonical authority must run `EverythingAI Phase 11 Structured Document Intelligence Foundation Qualification`; Phase 10 research/canonical work preserves `EverythingAI Phase 10 Advanced Document Intelligence Research Qualification`; Phase 9 enrichment-affecting work preserves `EverythingAI Phase 9 AI Metadata Enrichment Controls Closure Qualification`; Phase 8 watcher-affecting work preserves `EverythingAI Phase 8 Watcher Stale Preview Closure Qualification`; Phase 7 foundation-affecting work preserves `EverythingAI Phase 7 Foundation Closure Qualification`; Phase 6-affecting work preserves `EverythingAI Phase 6 Closure Qualification` unless explicitly superseded.
## Current next-step rule

Phase 12 is active through Phase 12.2. Do not begin Phase 12.4+ real extractor execution until the CEO explicitly resolves issue #435.

Any real OCR/layout/table/image/chart extractor activation, Python/child-process sidecar, Docling/Tesseract/PaddleOCR/PyMuPDF dependency, remote processing, structured persistence/schema migration, or replacement of legacy extraction/search/Wiki authority requires separately scoped acceptance. PyMuPDF remains license-gated. Provider neutrality, local-first behavior, read-only foundation semantics and all earlier filesystem/action/governance boundaries remain inherited.
