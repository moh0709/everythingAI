# Phase 12.4 — Bounded Local Docling + Tesseract Benchmark Runner

Date: 2026-09-22  
Parent: #430  
Authorization: #435 — CEO selected Option A  
Implementation issue: #438

## Scope

This slice activates **benchmark-only local process authority** for one fixed scanned-image case and exactly two candidates:

- Docling 2.129.0 using local Tesseract CLI OCR and the pinned Heron layout model;
- Tesseract 5.5.3 as the standalone OCR baseline.

It does not activate production extraction, automatic indexing, persistence, schema changes, remote document processing, filesystem/archive actions, automatic provider selection, or automatic winner selection.

## Locked software and model baseline

| Component | Version / revision | License | Role |
|---|---|---|---|
| Docling | 2.129.0 | MIT | Structured local candidate |
| docling-layout-heron | 8f39ad3c0b4c58e9c2d2c84a38465abf757272d8 | Apache-2.0 | Docling layout model |
| Tesseract | 5.5.3 | Apache-2.0 | Standalone OCR baseline and Docling OCR engine |
| tessdata_best English | e12c65a915945e4c28e237a9b52bc4a8f39a0cec | Apache-2.0 | English OCR data |

TableFormer and all other Docling model families are deferred in this first real execution slice.

## Execution boundary

Benchmark execution is accepted only when:

1. the operator explicitly invokes `scripts/run-phase12-local-extractor-benchmark.mjs`;
2. the source resolves inside the fixed corpus directory;
3. the source hash, byte size and modification time still match the request immediately before extraction;
4. required local model roots are present;
5. a `.everythingai-phase12-model-lock.json` marker matches the exact expected model revision set;
6. installed software versions exactly match the runtime lock;
7. proxy variables and unrelated secret-bearing environment variables are not forwarded by the Node runner;
8. Docling/Hugging Face offline flags are forced;
9. the child process uses `shell: false` and bounded stdout/stderr;
10. the process finishes before the configured timeout;
11. the adapter response validates through the accepted Phase 11 request/response and structured-document contracts;
12. two repeated executions produce the same normalized extraction digest.

## Fixed corpus

The committed source `services/api/test/fixtures/structured-benchmark-real/ocr-scan.pbm` is a deterministic synthetic Netpbm image containing only:

> AI BENCHMARK 2026

Tesseract reads the PBM directly. For Docling, the adapter converts the PBM to a PNG **in memory** and supplies it as a `DocumentStream`; the committed source is never rewritten.

## Local preparation

CI deliberately does not install or download Docling, Tesseract, or model data. Accepted real benchmark evidence must be produced in a local Linux/WSL environment prepared outside the production runtime.

Example preparation:

    python3 -m venv .phase12-venv
    source .phase12-venv/bin/activate
    pip install "docling==2.129.0"
    tesseract --version

`tesseract --version` must report exactly `5.5.3` for accepted evidence.

Set local artifact roots:

    export DOCLING_ARTIFACTS_PATH="$PWD/.phase12-models/docling"
    export TESSDATA_PREFIX="$PWD/.phase12-models/tessdata"

Pre-fetch the pinned Heron model and `tessdata_best` English data at the revisions in `services/api/config/structured-extractor-runtime-lock.json`. No accepted benchmark run may download a model during extraction.

After verifying the downloaded revisions, place `.everythingai-phase12-model-lock.json` in a required model root. For Docling its contents are:

    {
      "model_revisions": [
        "docling-layout-heron@8f39ad3c0b4c58e9c2d2c84a38465abf757272d8",
        "tessdata_best-eng@e12c65a915945e4c28e237a9b52bc4a8f39a0cec"
      ]
    }

For the standalone Tesseract candidate the marker contains only the `tessdata_best-eng@...` entry.

## Explicit benchmark invocation

    node scripts/run-phase12-local-extractor-benchmark.mjs --candidate tesseract
    node scripts/run-phase12-local-extractor-benchmark.mjs --candidate docling

The scripts print evidence to stdout only. EverythingAI does not persist benchmark results automatically.

## Evidence captured

Each accepted run records:

- exact candidate identity;
- exact software version;
- exact model revision identities;
- runtime milliseconds;
- peak RSS MB;
- cold-start milliseconds;
- repeat count;
- deterministic normalized extraction digest;
- Phase 12 benchmark score/digest;
- unchanged no-authority flags.

## Qualification versus real benchmark evidence

The Phase 12.4 GitHub qualification verifies code, locks, tests, Python syntax and authority boundaries **without installing or executing Docling/Tesseract**. A green PR therefore proves the benchmark runner is safely bounded; it does not claim that real candidate benchmark numbers have already been produced.

Real candidate evidence is a separate operator execution step and must fail closed if the exact pinned runtime is unavailable.

## Deferred work

- native-text PDF comparison;
- structured tables / TableFormer;
- multicolumn layouts;
- charts and figures;
- rotated or low-quality scans;
- PaddleOCR;
- PyMuPDF;
- production integration;
- provider selection or automatic ranking.
