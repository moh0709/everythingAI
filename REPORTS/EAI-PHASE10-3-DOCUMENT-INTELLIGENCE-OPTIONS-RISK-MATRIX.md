# EverythingAI Phase 10.3 — Document Intelligence Implementation Options and Risk Matrix

Date: 2026-09-20  
Issue: #407  
Parent: #402  
Status: RESEARCH / ADVISORY ONLY — NO RUNTIME DEPENDENCY ACTIVATED

## 1. Purpose

This report compares concrete implementation approaches for advanced document intelligence against:

- the current EverythingAI repository architecture;
- the Phase 10.1 capability inventory;
- the Phase 10.2 structured evidence/provenance contract;
- the accepted local-first, provider-neutral and read-only safety boundaries.

This report does **not** install, enable or select a production OCR/model/provider.

---

## 2. Repository constraints that drive the decision

EverythingAI currently has:

- a Node.js API runtime;
- SQLite local-first persistence;
- a simple active text extractor;
- durable source/chunk evidence;
- source fingerprints;
- stable Wiki evidence IDs;
- a provider-neutral architectural direction;
- strong inherited CI/release discipline.

The advanced document-intelligence layer must therefore:

1. remain optional and replaceable;
2. not become the backend authority for files/actions;
3. return a provider-neutral JSON/evidence contract;
4. preserve the current `extracted_text` compatibility projection;
5. stay read-only;
6. support local execution first;
7. preserve source fingerprint/evidence identity;
8. avoid forcing a Python rewrite of the Node API.

---

## 3. Integration architecture options

### Option A — Node-native extraction stack

Concept:

```text
EverythingAI Node API
  -> JavaScript/Node PDF/OCR/layout libraries
  -> Phase 10.2 structured evidence
```

Strengths:

- one runtime;
- simple packaging conceptually;
- no IPC/service boundary.

Weaknesses:

- advanced OCR/layout/table ecosystem is materially stronger in Python today;
- higher risk of assembling many separate libraries;
- difficult to obtain one coherent provider-neutral document object;
- likely more custom geometry/table/reading-order code;
- may reduce implementation speed and testability.

Assessment:

```text
Not recommended as the primary advanced-intelligence path.
```

Node should remain the orchestration/authorization authority, but not necessarily perform all document vision inference in-process.

---

### Option B — isolated local Python sidecar/service

Concept:

```text
EverythingAI Node API
  -> localhost/child-process document-intelligence adapter
      -> Docling / PaddleOCR / Tesseract / future adapters
  <- Phase 10.2 structured evidence JSON
```

Strengths:

- preserves Node API authority;
- isolates Python/model dependencies;
- makes OCR/layout provider replaceable;
- supports local-only operation;
- supports separate CPU/memory/time limits;
- easier to compare extractors against identical fixtures;
- natural mapping to the Phase 10.2 provider-neutral envelope.

Weaknesses:

- adds process lifecycle/IPC packaging;
- requires Python runtime or packaged executable/environment;
- must handle crashes/timeouts/version compatibility explicitly.

Assessment:

```text
Recommended architecture boundary for future implementation.
```

This recommendation is architectural only; no sidecar is activated by Phase 10.

---

### Option C — remote document-processing API

Concept:

```text
EverythingAI
  -> external OCR/document AI API
  <- provider result
```

Strengths:

- potentially low local hardware requirement;
- provider may supply advanced models/managed scaling.

Weaknesses:

- document bytes leave the local environment;
- privacy/tenant/consent requirements become much stronger;
- network/API cost;
- provider lock-in risk;
- hidden version changes;
- availability dependency;
- conflicts with local-first default unless explicitly opted in.

Assessment:

```text
Do not use as the default EverythingAI path.
```

A future remote adapter may be optional under explicit policy/consent, but is outside current authority.

---

## 4. Candidate technology: Docling

Official project:

- https://github.com/docling-project/docling
- https://github.com/docling-project/docling/blob/main/docs/usage/model_catalog.md

### Current verified capabilities

Official Docling documentation describes:

- multiple document formats including PDF, DOCX, PPTX, XLSX and images;
- advanced PDF understanding;
- page layout and reading order;
- table structure;
- code and formulas;
- image classification;
- unified `DoclingDocument` representation;
- lossless JSON export;
- multiple OCR engines;
- table-structure recognition;
- picture classification and optional picture-description/VLM capabilities.

The Docling repository states the codebase is MIT licensed, while individual model licenses must be checked separately.

### Fit to Phase 10.2 contract

| Contract element | Docling fit |
|---|---|
| pages | Strong |
| blocks/layout | Strong |
| reading order | Strong |
| tables/cells | Strong |
| figures/pictures | Strong |
| bounding boxes | Strong |
| OCR | Pluggable |
| unified representation | Strong |
| JSON mapping | Strong |
| local execution | Supported |
| provider-neutral adapter | Good fit behind EverythingAI adapter |

### Risks

- Python/model dependency footprint;
- potentially substantial CPU/RAM/model startup cost;
- individual model licensing must be reviewed;
- optional VLM features increase hardware/privacy complexity;
- mapping Docling's schema to EverythingAI's contract must be explicit rather than leaking Docling types into core APIs.

### Recommended role

```text
Primary prototype candidate for the structured-document adapter.
```

Use only through an EverythingAI adapter that emits the Phase 10.2 contract.

Do not make `DoclingDocument` the application-wide persistence contract.

---

## 5. Candidate technology: PaddleOCR / PP-StructureV3

Official project/documentation:

- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/PP-StructureV3.en.md
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-StructureV3/PP-StructureV3.en.md

### Current verified capabilities

Official PP-StructureV3 documentation describes:

- OCR;
- document orientation/unwarping options;
- layout-region detection;
- table recognition;
- formula recognition;
- multi-column reading-order recovery;
- chart understanding;
- Markdown/result conversion;
- local Paddle inference;
- CPU and GPU execution;
- service-based deployment for non-Python applications.

PaddleOCR code/package metadata is Apache 2.0 licensed.

Official documentation also warns that some configurations can use substantial resources and recommends lighter configurations or disabling unnecessary modules where memory/performance is constrained.

### Fit to Phase 10.2 contract

| Contract element | PaddleOCR fit |
|---|---|
| OCR | Very strong |
| page regions/layout | Strong |
| tables | Strong |
| reading order | Strong |
| chart parsing | Supported by current pipeline |
| formulas | Supported |
| bounding regions | Strong |
| local CPU | Supported |
| local GPU | Supported |
| service boundary | Explicitly supported |

### Risks

- larger ML stack and model footprint;
- operational complexity;
- performance varies materially with enabled modules/hardware;
- data model is pipeline-specific and must be normalized;
- upgrading model/pipeline versions may change outputs;
- default full pipeline may be excessive for ordinary local files.

### Recommended role

```text
Specialized comparison/fallback adapter for OCR-heavy and difficult-layout fixtures.
```

PaddleOCR is particularly valuable as the benchmark comparator for:

- scanned PDFs;
- image text;
- difficult table/layout documents;
- multi-column documents.

It should not be hard-coded into EverythingAI core types.

---

## 6. Candidate technology: Tesseract OCR

Official project:

- https://github.com/tesseract-ocr/tesseract
- https://github.com/tesseract-ocr/tessdoc

### Current verified capabilities

Official Tesseract documentation states:

- open-source OCR engine;
- Apache 2.0 license;
- Unicode support;
- recognition for more than 100 languages out of the box;
- image inputs such as PNG/JPEG/TIFF;
- output including plain text, hOCR, TSV, ALTO and PAGE.

### Fit to Phase 10.2 contract

Tesseract outputs such as TSV/hOCR/ALTO/PAGE can provide:

- OCR text;
- word/region position information;
- confidence/evidence inputs suitable for normalization.

### Strengths

- mature;
- local;
- no remote document transfer;
- broad language coverage;
- comparatively understandable OCR-only scope;
- useful deterministic control/baseline.

### Weaknesses

- not a complete document-layout/table/chart intelligence framework;
- image preprocessing quality materially affects OCR quality;
- reading order/table semantics need additional logic/frameworks.

### Recommended role

```text
Local OCR baseline and fallback, not the full advanced-document-intelligence stack.
```

It is also useful as a benchmark control so advanced pipelines must demonstrate measurable benefit beyond basic OCR.

---

## 7. Candidate technology: PyMuPDF

Official documentation:

- https://pymupdf.readthedocs.io/en/latest/the-basics.html
- https://pymupdf.readthedocs.io/en/latest/about.html
- https://github.com/pymupdf/PyMuPDF

### Current verified capabilities

Official PyMuPDF documentation demonstrates:

- page-aware PDF text extraction;
- text blocks and word-level positions;
- bounding/layout metadata;
- page rendering;
- image extraction;
- table detection/extraction;
- OCR integration through Tesseract.

Technically, this is a strong match for a lightweight native-PDF first stage.

### Material licensing constraint

Official PyMuPDF documentation states PyMuPDF/MuPDF is dual-licensed:

- GNU AGPL for open-source use;
- commercial licensing available for proprietary applications.

This is not merely an engineering detail.

If EverythingAI is intended to remain proprietary/non-AGPL, using PyMuPDF requires explicit licensing/legal compatibility review or a commercial license.

### Recommended role

```text
Technically attractive benchmark/prototype option, but not an accepted default dependency until licensing is resolved.
```

Do not introduce PyMuPDF into the product dependency tree under Phase 10 research authority.

---

## 8. Comparative matrix

| Dimension | Docling | PaddleOCR / PP-StructureV3 | Tesseract | PyMuPDF |
|---|---|---|---|---|
| Primary strength | unified document structure | OCR + layout/table pipeline | OCR | native PDF geometry/extraction |
| Local operation | Yes | Yes | Yes | Yes |
| OCR | Multiple engines | Strong | Core feature | Via Tesseract |
| Layout | Strong | Strong | Limited | Native blocks/geometry |
| Reading order | Strong | Strong | Limited | requires handling/sorting |
| Tables | Strong | Strong | No full semantic table model | Native table extraction |
| Figures/images | Classification/options | chart/layout support | OCR only | extraction/rendering |
| Unified document object | Yes | pipeline result | No | API primitives |
| Node-native | No, Python | No, Python/service | CLI/C++ wrappers possible | Python |
| License | MIT code; model licenses vary | Apache 2.0 | Apache 2.0 | AGPL/commercial |
| Resource footprint | Medium/high depending models | Medium/high depending pipeline | Low/medium | Low/medium |
| Phase 10.2 fit | Excellent | Excellent after normalization | OCR subset | Excellent technically |
| Current recommendation | primary prototype | specialist comparator | OCR baseline | license-gated benchmark |

---

## 9. Architecture recommendation

### Recommended boundary

```text
Node API remains source of authority
  |
  | read-only extraction request
  v
Document Intelligence Adapter
  |
  +-- DoclingAdapter
  +-- PaddleOcrAdapter
  +-- TesseractAdapter
  +-- future adapters
  |
  v
Phase 10.2 StructuredDocumentExtraction
  |
  +-- deterministic plain_text compatibility projection
  +-- evidence IDs / page/block/table/figure provenance
  v
Existing EverythingAI persistence/search/wiki pipeline
```

### Non-negotiable rule

No adapter-specific result shape may propagate past the adapter boundary.

EverythingAI core consumes only the Phase 10.2 contract.

---

## 10. Recommended prototype sequence

### Prototype A — contract fixture validator

Before running any OCR engine:

1. create static structured-extraction fixture JSON;
2. validate page/block/table/figure IDs;
3. validate source-fingerprint binding;
4. validate deterministic plain-text projection;
5. validate native/OCR/visual provenance;
6. validate no secrets and no mutation authority.

This can be implemented without any ML dependency.

### Prototype B — Docling local adapter

Goal:

- one representative native PDF;
- one scanned PDF;
- one table PDF;
- map result to Phase 10.2;
- no persistence migration;
- process one file on explicit test invocation only.

### Prototype C — Tesseract control

Use the same scanned fixture and compare:

- OCR text recovery;
- word/region geometry;
- confidence;
- CPU time/memory.

### Prototype D — PaddleOCR comparator

Use only if fixtures show Docling/Tesseract gaps requiring:

- stronger layout;
- table recognition;
- difficult OCR;
- chart/formula processing.

This ordering prevents adopting the heaviest stack before proving the need.

---

## 11. Why an isolated Python adapter is preferred

EverythingAI should not convert the API runtime to Python.

The adapter boundary provides:

- process isolation;
- crash isolation;
- explicit timeouts;
- memory limits;
- separate dependency lifecycle;
- reproducible version pinning;
- easy A/B fixture comparison;
- provider replacement;
- local-only networking (if HTTP is used);
- no expansion of filesystem authority.

Preferred transports to evaluate later:

1. child process with JSON stdin/stdout for earliest prototype;
2. localhost HTTP service if concurrency/lifecycle demands it;
3. packaged sidecar executable/environment for distribution.

A child-process fixture prototype is the smallest architecture proof.

---

## 12. Security/privacy matrix

| Concern | Required rule |
|---|---|
| source bytes leave machine | forbidden by default |
| remote provider fallback | forbidden silently |
| secrets in provenance | forbidden |
| local sidecar network exposure | bind localhost only if HTTP |
| arbitrary file path requests | Node API resolves/authorizes scope first |
| sidecar filesystem mutation | no write/move/delete authority |
| output injection | normalize/validate contract |
| malformed model output | fail closed |
| stale source | fingerprint mismatch invalidates extraction |
| large files | page/file limits + timeout/cancellation |
| tenant/workspace production scope | inherited authorization must be resolved before extraction |

---

## 13. Performance/resource strategy

Do not make the full document-intelligence pipeline automatic for every indexed file initially.

Recommended future control:

```text
native text extraction first
  -> if sufficient, keep native result
  -> if image-only/low-text, request OCR
  -> if complex layout/table requires it, request structured pipeline
  -> optional visual inference only under explicit policy
```

This preserves CPU/RAM and minimizes unnecessary model work.

### Progressive capability tiers

```text
Tier 0: current flattened text
Tier 1: page-aware native structured text
Tier 2: OCR fallback
Tier 3: table/layout intelligence
Tier 4: optional figure/chart semantic enrichment
```

Each tier must preserve the same evidence contract.

---

## 14. Licensing/dependency gate

Before any runtime dependency is accepted, record:

- software license;
- model weights/license;
- redistribution rights;
- commercial-use implications;
- offline model-download behavior;
- transitive native binaries;
- supported Windows/Linux packaging;
- update/version policy.

Current advisory assessment:

- Docling code: MIT, but model licenses require per-model review;
- PaddleOCR code/package: Apache 2.0;
- Tesseract: Apache 2.0;
- PyMuPDF: AGPL or commercial license — explicit gate required.

No legal conclusion beyond the published license terms is made by this engineering report.

---

## 15. Benchmark requirements before implementation acceptance

A later implementation phase should not pick a winner from feature lists alone.

Create a small EverythingAI fixture corpus:

```text
01-native-text.pdf
02-scanned-text.pdf
03-hybrid-native-scan.pdf
04-multicolumn.pdf
05-table-simple.pdf
06-table-complex.pdf
07-chart-caption.pdf
08-image-text.png
09-rotated-scan.pdf
10-low-quality-scan.pdf
```

Measure:

- text accuracy;
- page attribution;
- reading order;
- table cell accuracy;
- evidence ID stability;
- duplicate text;
- OCR confidence;
- runtime;
- peak RAM;
- cold-start time;
- output determinism;
- compatibility projection.

The benchmark must run locally and preserve source fixtures.

---

## 16. Dependency/risk matrix

| Dependency | Need | Risk | Decision |
|---|---|---:|---|
| Phase 10.2 contract | mandatory | low | accepted |
| Python sidecar boundary | likely | medium | prototype recommended |
| Docling | useful primary prototype | medium | advisory candidate |
| Tesseract | useful OCR baseline | low/medium | advisory candidate |
| PaddleOCR | useful specialist comparator | medium/high | defer until benchmark need |
| PyMuPDF | technically useful | licensing high | do not adopt until license gate |
| DB schema migration | not needed for prototype | medium | defer |
| remote OCR API | not needed | privacy/high | defer/opt-in only |
| GPU requirement | not acceptable as MVP prerequisite | high | CPU path must exist |
| visual VLM | optional later | high | explicit separate gate |

---

## 17. Recommended next implementation milestone after research closure

Phase 10 research should close before runtime work.

Then, if the CEO authorizes implementation, the first runtime milestone should be separately created as something equivalent to:

```text
Structured Document Intelligence 1.0 —
provider-neutral fixture validator and local sidecar protocol
```

Its scope should be:

- no model dependency initially;
- static fixture → contract validation;
- child-process JSON protocol;
- timeout/error boundary;
- source fingerprint binding;
- deterministic `plain_text` projection;
- zero persistence migration;
- zero filesystem mutation.

Only after that protocol is green should a Docling/Tesseract adapter be considered.

---

## 18. Research recommendation

### Architecture

Use an **isolated local Python document-intelligence adapter** while keeping the EverythingAI Node API as the source of authority.

### First prototype candidate

Use **Docling** as the first structured-document adapter candidate because its unified representation, layout/table support, OCR pluggability and MIT code license align well with the Phase 10.2 contract.

### OCR baseline

Use **Tesseract** as a lightweight local OCR control/baseline.

### Specialist comparator

Use **PaddleOCR / PP-StructureV3** when the fixture corpus demonstrates a need for stronger OCR/layout/table/chart handling.

### Licensing caution

Keep **PyMuPDF** out of accepted runtime dependencies until AGPL/commercial-license compatibility is explicitly resolved.

### Most important sequencing decision

Do not install any of them yet.

First close Phase 10 research and establish the adapter/fixture protocol as a separately gated implementation phase.

---

## 19. Official external sources reviewed

Docling:
- https://github.com/docling-project/docling
- https://github.com/docling-project/docling/blob/main/docs/usage/model_catalog.md
- https://github.com/docling-project/docling/blob/main/packages/docling/pyproject.toml

PaddleOCR:
- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/PP-StructureV3.en.md
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-StructureV3/PP-StructureV3.en.md
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/pyproject.toml

Tesseract:
- https://github.com/tesseract-ocr/tesseract
- https://github.com/tesseract-ocr/tessdoc

PyMuPDF:
- https://pymupdf.readthedocs.io/en/latest/the-basics.html
- https://pymupdf.readthedocs.io/en/latest/about.html
- https://github.com/pymupdf/PyMuPDF

External facts in this report are advisory and reflect the official sources reviewed on 2026-09-20.

---

## 20. Authority statement

This report is research-only.

It does not authorize:

- dependency installation;
- OCR/model execution in product runtime;
- Python sidecar deployment;
- remote document processing;
- GPU infrastructure;
- database migration;
- filesystem mutation;
- archive execution/approval;
- production infrastructure activation;
- commercial-license purchase;
- external certification;
- SLA/SLO commitments.
