# Phase 10 — Advanced Document Intelligence Research Release Decision

Date: 2026-09-20  
Parent issue: #402  
Closure issue: #409  
Decision target: `PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS`

## Decision

`PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS`

Phase 10 research is accepted as a **research and architecture milestone only**.

This decision accepts the repository-grounded capability inventory, the provider-neutral structured evidence/provenance contract, and the implementation-options/risk analysis. It does **not** claim that advanced document-intelligence runtime capability has been implemented.

## Accepted research chain

- Phase 10.1 — Current document extraction capability inventory — PR #404 merge `f8cff3fe31c37a768222f4f5aafc00ef698c6195`.
- Phase 10.2 — Structured document evidence/provenance contract — PR #406 merge `459abab4900595abb585d12b0f7fa61e6aef7b87`.
- Phase 10.3 — Implementation options and risk matrix — PR #408 merge `8de98bf0e10d28705a9b6d72c89015f2c26d1ea6`.

## Accepted findings

EverythingAI currently has text-centric extraction and durable source/chunk evidence but does not yet have accepted runtime OCR, page/block layout intelligence, structured PDF/DOCX table extraction, chart/image understanding, OCR confidence, bounding-box evidence, or region-level visual provenance.

The accepted architecture target is a provider-neutral structured extraction contract bound to source fingerprints, with explicit distinction between native text, OCR-derived text, and visual/model-generated descriptions.

The recommended future integration boundary is an isolated local document-intelligence adapter while the Node API remains the authority boundary.

## Advisory implementation recommendation

If a later implementation phase is authorized:

1. establish a model-free fixture validator and local adapter protocol first;
2. keep the Node API authoritative;
3. use Docling as the first structured-document prototype candidate;
4. use Tesseract as an OCR baseline/control;
5. use PaddleOCR / PP-StructureV3 as a specialist comparator when fixture evidence justifies it;
6. keep PyMuPDF license-gated until AGPL/commercial compatibility is explicitly resolved.

These are research recommendations, not activated dependencies.

## Explicit non-implementation boundary

This PASS does **not** mean any of the following is implemented or authorized:

- OCR/model execution in product runtime;
- Python sidecar deployment;
- Docling/PaddleOCR/Tesseract/PyMuPDF dependency installation;
- remote document processing;
- database/schema migration;
- filesystem write/move/delete/rename authority;
- archive overwrite or automatic archive execution;
- automatic approval;
- privileged production infrastructure;
- external certification;
- commercial SLA/SLO commitments.

## Evidence

- `REPORTS/EAI-PHASE10-1-DOCUMENT-INTELLIGENCE-CAPABILITY-INVENTORY.md`
- `REPORTS/EAI-PHASE10-2-STRUCTURED-DOCUMENT-EVIDENCE-CONTRACT.md`
- `REPORTS/EAI-PHASE10-3-DOCUMENT-INTELLIGENCE-OPTIONS-RISK-MATRIX.md`
- `scripts/validate-phase10-document-intelligence-research.mjs`
- `.github/workflows/ci-phase10-document-intelligence-research.yml`

## Rollback

All Phase 10 research artifacts are evidence-only and independently reversible without changing accepted Phase 9 runtime contracts.
