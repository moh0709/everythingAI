# EverythingAI Phase 10.2 — Structured Document Evidence and Provenance Contract

Date: 2026-09-20  
Issue: #405  
Parent: #402  
Status: RESEARCH / ARCHITECTURE CONTRACT ONLY

## 1. Purpose

This document defines the provider-neutral structured document extraction contract recommended by Phase 10.1.

It does not implement OCR, layout analysis, table extraction, chart/image understanding, or any external model/provider integration.

The goal is to define the evidence shape first so future extractors can be swapped, compared, validated, and audited without changing the core knowledge/evidence architecture.

## 2. Inherited repository constraints

This contract must preserve:

- current local-first text extraction;
- existing `file_extractions.extracted_text` compatibility;
- durable source files and fingerprints;
- Wiki source/chunk evidence;
- line/character provenance;
- nullable page-number support;
- provider neutrality;
- Phase 9 field-level AI provenance;
- read-only extraction semantics;
- no coupling between extraction and planning/execution authority.

## 3. Core design principles

### 3.1 Evidence before interpretation

Every structured output must identify the source file and exact extraction evidence that produced it.

### 3.2 Native text and inferred text are different evidence classes

Native document text, OCR text, and model-generated visual descriptions must never be conflated.

### 3.3 Provider-neutral backend truth

The backend contract stores capability/provenance, not vendor-specific schemas.

### 3.4 Compatibility projection

Every structured extraction must be able to produce a deterministic plain-text projection so existing search, embeddings, Wiki generation, and document preview remain functional.

### 3.5 Read-only boundary

Extraction may read files and produce evidence records. It must not rename, move, delete, overwrite, approve, execute, or otherwise mutate source/archive files.

---

## 4. Top-level extraction envelope

Proposed logical contract:

```text
StructuredDocumentExtraction
  schema_version
  file_id
  source_path
  source_fingerprint
  mime_type
  extractor
  extraction_mode
  extracted_at
  status
  pages[]
  blocks[]
  tables[]
  figures[]
  warnings[]
  plain_text
```

### 4.1 Required fields

```text
schema_version
file_id
source_fingerprint.hash
extractor.id
extractor.version
extraction_mode
status
plain_text
```

### 4.2 Extraction mode

Allowed semantic modes:

```text
native_text
ocr
hybrid
structured_native
visual_inference
```

Meaning:

- `native_text`: text read directly from document structure/text layer;
- `ocr`: text recognized from pixels;
- `hybrid`: native text plus selective OCR fallback;
- `structured_native`: layout/table structure extracted from document-native objects;
- `visual_inference`: semantic description generated from visual content.

A single extraction may contain regions with different evidence modes.

---

## 5. Source fingerprint binding

All structured extraction records must be bound to the source fingerprint used during extraction.

Minimum:

```text
source_fingerprint
  hash
  size_bytes
  mtime_ms
```

Rule:

```text
If the source fingerprint changes, structured evidence must be treated as stale until re-extracted or explicitly revalidated.
```

No structured record may be silently reused against a different source fingerprint.

---

## 6. Extractor provenance

Proposed extractor descriptor:

```text
extractor
  id
  version
  provider
  model
  configuration_hash
  local
```

Semantics:

- `id`: provider-neutral adapter/extractor ID;
- `version`: implementation version;
- `provider`: nullable provider identifier;
- `model`: nullable model identifier;
- `configuration_hash`: hash of extraction-relevant settings;
- `local`: whether source bytes remained local.

Rules:

1. Provider/model may be null for deterministic native extractors.
2. Provider/model fields identify provenance only; they do not become schema authority.
3. Secrets, API keys, tokens, cookies, credentials, signed URLs, and raw authorization headers must never be persisted.
4. Remote processing must be explicitly distinguishable from local extraction.

---

## 7. Page contract

```text
PageEvidence
  page_id
  page_number
  width
  height
  unit
  rotation
  native_text_available
  ocr_used
  block_ids[]
  evidence_mode
```

### 7.1 Stable page ID

Recommended logical basis:

```text
hash(file_id + source_fingerprint.hash + page_number)
```

The exact hash algorithm can be implementation-defined, but IDs must be deterministic for an unchanged source.

### 7.2 Geometry

Recommended normalized geometry:

```text
bbox
  x
  y
  width
  height
  coordinate_space
```

Preferred coordinate space:

```text
normalized_0_1
```

This avoids provider-specific point/pixel units in downstream consumers.

---

## 8. Block contract

```text
DocumentBlock
  block_id
  page_id
  block_type
  reading_order
  bbox
  text
  evidence_mode
  confidence
  native_object_ref
  parent_block_id
  child_block_ids[]
```

Allowed initial block types:

```text
heading
paragraph
list
list_item
table
figure
caption
header
footer
footnote
unknown
```

### 8.1 Evidence mode per block

Each block must explicitly identify one of:

```text
native
ocr
derived
visual_inference
```

A model-generated chart description is therefore visibly different from OCR text or PDF-native text.

---

## 9. Confidence contract

Confidence is optional and must never be fabricated.

Proposed shape:

```text
confidence
  value
  scale
  source
```

Rules:

- unknown confidence = null;
- do not convert missing confidence to 1.0;
- do not compare confidence values across providers unless their scales are normalized;
- confidence belongs to the evidence-producing step, not to the source truth itself.

Examples:

```text
source = "ocr_engine"
source = "layout_detector"
source = "table_detector"
source = "visual_model"
```

---

## 10. Table contract

```text
DocumentTable
  table_id
  page_id
  bbox
  title
  row_count
  column_count
  cells[]
  evidence_mode
  confidence
```

Cell contract:

```text
TableCell
  cell_id
  row_index
  column_index
  row_span
  column_span
  text
  bbox
  evidence_mode
  confidence
```

### 10.1 Table identity

A table must have stable identity independent of markdown rendering.

### 10.2 Plain-text projection

Suggested deterministic projection:

```text
[TABLE <table_id>]
Header A | Header B
Value A  | Value B
[/TABLE]
```

This preserves current text-search compatibility while keeping the structured table available separately.

### 10.3 No invented cells

Missing/uncertain cells remain empty/null and may carry warnings. The extractor must not infer unstated values merely to produce a rectangular table.

---

## 11. Figure/image contract

```text
DocumentFigure
  figure_id
  page_id
  bbox
  figure_type
  native_caption
  generated_description
  evidence_mode
  confidence
  provenance
```

Initial `figure_type` values may include:

```text
image
chart
diagram
screenshot
logo
unknown
```

### 11.1 Generated descriptions

If a visual model creates a description:

```text
generated_description
  value
  generated_by
  model
  evidence_refs
  generated_at
```

It must follow the same principle accepted in Phase 9:

- machine-generated content is labeled;
- generator provenance is retained;
- evidence refs identify the source region/page;
- user-edited text must not falsely retain AI attribution.

---

## 12. Evidence reference contract

Structured evidence references should be independent of UI-readable citation labels.

Logical shape:

```text
StructuredEvidenceRef
  evidence_id
  file_id
  source_fingerprint_hash
  page_id
  block_id
  table_id
  cell_id
  figure_id
  bbox
  extraction_mode
```

Only relevant fields are populated for a given reference.

Examples:

```text
paragraph -> page_id + block_id
table cell -> page_id + table_id + cell_id
figure -> page_id + figure_id
OCR region -> page_id + block_id + bbox
```

---

## 13. Stable evidence ID strategy

Recommended logical identity:

```text
hash(
  file_id
  + source_fingerprint_hash
  + evidence_kind
  + page_number
  + stable_position_key
  + normalized_content_prefix
)
```

Requirements:

- deterministic for unchanged content;
- changes when source fingerprint changes;
- does not depend on transient UI ordering;
- does not expose filesystem secrets;
- provider-independent where possible.

---

## 14. Native text versus OCR arbitration

Future hybrid extraction must avoid duplicated text.

Recommended precedence:

```text
1. native text where reliable
2. OCR only for regions/pages without usable native text
3. OCR augmentation only when explicitly marked
4. visual inference never replaces source text
```

Proposed page-level flags:

```text
native_text_available
native_text_character_count
ocr_used
ocr_reason
```

Possible `ocr_reason`:

```text
no_native_text
low_native_text_density
image_only_region
explicit_user_request
```

---

## 15. Warnings contract

Extraction must make uncertainty visible.

```text
ExtractionWarning
  code
  severity
  page_id
  evidence_id
  message
```

Initial warning codes could include:

```text
OCR_LOW_CONFIDENCE
READING_ORDER_UNCERTAIN
TABLE_STRUCTURE_UNCERTAIN
IMAGE_UNDESCRIBED
NATIVE_TEXT_AND_OCR_OVERLAP
PAGE_GEOMETRY_UNKNOWN
UNSUPPORTED_EMBEDDED_OBJECT
TRUNCATED_EXTRACTION
REMOTE_PROCESSING_DISABLED
```

Warnings are diagnostic evidence, not execution blockers unless an explicit later policy says so.

---

## 16. Backward-compatible plain-text projection

Existing EverythingAI systems depend on `file_extractions.extracted_text`.

Any future structured extractor must produce a deterministic compatibility projection.

Projection order:

```text
page_number ascending
  -> reading_order ascending
    -> heading/paragraph/list text
    -> table text projection
    -> native captions
    -> generated visual descriptions only when policy allows
```

Rules:

- visual generated descriptions should be labeled in projection;
- repeated headers/footers may be omitted only by documented deterministic rule;
- no hidden content rewriting;
- projection must be reproducible from the structured extraction object.

---

## 17. Mapping to current Wiki evidence

Current durable Wiki chunks support:

- stable chunk keys;
- line/character offsets;
- page numbers;
- evidence text.

Future mapping should be additive.

### 17.1 Text block mapping

A Wiki chunk may carry optional:

```text
structured_evidence_ids[]
page_number
block_ids[]
```

### 17.2 Table mapping

Wiki content may render a table as markdown while retaining:

```text
table_id
cell evidence IDs
page_number
```

### 17.3 Figure mapping

A generated figure description may become a source-backed knowledge block only if its generated provenance remains visible and linked to the source figure ID.

### 17.4 Existing citation compatibility

Readable citations such as:

```text
[S1]
[S1:C3]
```

may remain UI notation.

Backend truth should continue to rely on durable IDs.

---

## 18. Persistence recommendation

Phase 10.2 does **not** authorize a database migration.

Recommended future approach:

### Option A — metadata JSON first

Store the structured extraction envelope in `file_extractions.metadata_json` during an early prototype.

Advantages:

- minimal migration;
- preserves current SQLite MVP;
- fast research iteration.

Limitations:

- poor querying for individual tables/figures/regions.

### Option B — dedicated structured evidence tables

Later introduce normalized tables such as:

```text
document_pages
document_blocks
document_tables
document_table_cells
document_figures
document_extraction_runs
```

Recommended only after fixtures and contract tests prove the shape.

### Recommendation

Prototype against Option A contract fixtures first. Do not migrate schema until the contract is stable.

---

## 19. Privacy and remote-provider boundary

Any future remote OCR/vision provider requires a separately accepted policy.

Minimum required controls:

- remote processing disabled by default for local-first mode;
- explicit provider configuration;
- clear indication when document bytes/images leave the machine;
- no secrets persisted in provenance;
- no hidden provider fallback;
- failure when remote processing is unavailable must not silently trigger another provider;
- tenant/workspace authorization must be preserved in production modes;
- extraction result must record whether processing was local or remote.

This research phase does not authorize remote processing.

---

## 20. Runtime safety contract

Structured extraction is read-only.

Required invariant:

```text
filesystem_mutation_allowed = false
execution_allowed = false
automatic_approval_allowed = false
```

No OCR/layout/vision implementation may:

- move source files;
- rename source files;
- delete source files;
- overwrite archive files;
- approve archive plans;
- execute organization actions;
- expand watcher authority.

---

## 21. Test-fixture requirements for future implementation

Before an extractor is accepted, deterministic fixtures should cover:

1. native-text PDF;
2. scanned image-only PDF;
3. hybrid PDF with native text + image region;
4. multi-column PDF;
5. PDF table;
6. DOCX table;
7. XLSX workbook with multiple sheets;
8. chart with caption;
9. image with text;
10. rotated page;
11. low-quality OCR;
12. duplicated header/footer;
13. source fingerprint change;
14. malformed/encrypted/unsupported file.

Each fixture should have expected evidence assertions, not merely text snapshots.

---

## 22. Acceptance metrics for later implementation

No provider comparison should be accepted only on subjective output quality.

Suggested measurable categories:

- text recovery accuracy;
- page attribution accuracy;
- reading-order accuracy;
- table cell alignment;
- evidence-ID stability;
- duplicate-text rate;
- OCR confidence calibration;
- extraction latency;
- peak memory;
- compatibility projection stability;
- source fingerprint/staleness correctness.

Exact thresholds require a later separately approved benchmark specification.

---

## 23. Phase 10.2 decision

### Accepted research direction

The provider-neutral contract should become the architectural target for advanced document intelligence.

### Not yet selected

This phase does not select:

- OCR engine;
- PDF layout engine;
- table extraction library;
- vision model;
- remote provider;
- database migration.

### Recommended next task

Proceed to **Phase 10.3 — implementation options and dependency/risk matrix**.

That task should compare concrete technical approaches against this contract and the current repository constraints, while keeping provider selection advisory rather than activating a runtime dependency.

---

## 24. Authority statement

This document is an architecture contract only.

It grants no authority for:

- production OCR/model invocation;
- remote document processing;
- provider-specific lock-in;
- schema migration;
- filesystem mutation;
- archive overwrite;
- automatic planning/approval/execution;
- broad-drive watch;
- privileged infrastructure;
- destructive migration;
- external certification or SLA/SLO commitments.
