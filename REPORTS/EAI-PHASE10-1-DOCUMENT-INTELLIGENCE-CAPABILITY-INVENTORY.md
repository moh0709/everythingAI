# EverythingAI Phase 10.1 — Document Intelligence Capability Inventory

Date: 2026-09-20  
Issue: #403  
Parent: #402  
Status: RESEARCH EVIDENCE ONLY — NO RUNTIME AUTHORITY CHANGE

## Executive summary

EverythingAI currently has a solid text-centric document ingestion and evidence foundation, but it does **not** yet implement advanced document intelligence for OCR, layout reconstruction, native table extraction, chart understanding, image understanding, or region-level visual provenance.

The active API extraction path is deliberately simple and local:

- `.txt`, `.md`, `.csv` → UTF-8/plain text
- `.pdf` → flattened text via `pdf-parse`
- `.docx` → raw text via `mammoth`
- `.xlsx` → rows flattened to comma-separated text via `read-excel-file`

The newer ingestion service can identify MIME types and route files conceptually to names such as `imageExtractor`, `audioExtractor`, `videoExtractor`, `pdfExtractor`, and `xlsxExtractor`, but repository evidence reviewed for this spike does not show those advanced extractor implementations being present or connected to the active API extraction path.

EverythingAI already has important downstream evidence infrastructure that can support future advanced extraction:

- durable source files and fingerprints;
- extracted-text persistence;
- Wiki source/chunk records;
- stable chunk keys;
- line/character offsets;
- nullable page-number storage;
- source-backed citations;
- page-map enrichment hooks;
- source/evidence references;
- provider-neutral architecture and explicit safety boundaries.

The recommended next step is therefore **not** a broad OCR refactor. The recommended architecture is to introduce a provider-neutral structured extraction contract first, then add capabilities incrementally behind explicit extractors and tests.

---

## 1. Repository evidence inspected

Primary runtime/extraction files:

- `services/api/src/extractors/documentExtractor.js`
- `services/api/src/extractors/extractionRunner.js`
- `services/api/src/documents/documentContextService.js`
- `services/api/src/knowledge/sourcePageMetadata.js`
- `services/api/src/knowledge/knowledgeService.js`
- `services/api/src/db/wikiRepository.js`
- `services/api/src/db/schema.sql`
- `services/api/src/embeddings/embeddingService.js`
- `services/ingestion/src/mime/mimeDetectionService.js`
- `services/ingestion/src/orchestration/extractorRoutingService.js`
- `services/ingestion/src/orchestration/ingestionPipelineOrchestrator.js`

Tests/design evidence:

- `services/api/test/staleExtraction.test.js`
- `services/api/test/documentContext.test.js`
- `docs/PHASE1_STEP01_RUNTIME_INGESTION_AUDIT.md`
- `docs/WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md`
- `docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md`
- `services/api/package.json`

This report describes only capabilities supported by the inspected repository evidence.

---

## 2. Verified current extraction capability

### 2.1 Active API extractor

File: `services/api/src/extractors/documentExtractor.js`

Supported extensions are explicitly:

```text
.txt
.md
.csv
.pdf
.docx
.xlsx
```

### 2.2 Plain-text extraction

`.txt`, `.md`, and `.csv` are read as UTF-8 and normalized to line-feed newlines.

Verified behavior:

- direct file read;
- no document layout model;
- no structured CSV schema persistence;
- extracted result stored as one text body.

### 2.3 PDF extraction

PDF extraction uses:

```text
pdf-parse
PDFParse#getText()
```

The active implementation returns:

```text
normalizeText(data.text || '')
```

Verified current characteristics:

- text extraction only;
- flattened output;
- no OCR fallback in this path;
- no explicit page objects produced by `documentExtractor.js`;
- no bounding boxes/coordinates;
- no native table object model;
- no chart/image interpretation.

The extractor metadata currently stores:

```json
{
  "extension": ".pdf",
  "character_count": "..."
}
```

No `page_map` or `pages` metadata is written by this active extractor.

### 2.4 DOCX extraction

DOCX uses:

```text
mammoth.extractRawText()
```

Verified current characteristics:

- raw textual content;
- formatting/layout intentionally flattened;
- no image extraction;
- no table-cell structural persistence shown in the active extractor.

### 2.5 XLSX extraction

XLSX uses `read-excel-file` and converts rows to text:

```text
cell1,cell2,cell3
row2cell1,row2cell2,row2cell3
```

Verified current characteristics:

- spreadsheet values are recoverable as text;
- row/column geometry is not persisted as a structured table model;
- worksheet-level provenance is not visible in the current extractor output;
- formulas/styles/charts are not represented by the inspected path.

---

## 3. MIME and extractor routing foundation

File: `services/ingestion/src/mime/mimeDetectionService.js`

The ingestion service recognizes MIME mappings for:

- PDF
- DOCX
- XLSX
- PPTX
- PNG
- JPG/JPEG
- MP3
- WAV
- MP4
- ZIP
- JSON
- XML

File: `services/ingestion/src/orchestration/extractorRoutingService.js`

Routing can label inputs as:

```text
imageExtractor
audioExtractor
videoExtractor
pdfExtractor
xlsxExtractor
genericExtractor
```

### Verified limitation

The inspected repository tree does not show concrete modules named:

```text
imageExtractor
audioExtractor
videoExtractor
pdfExtractor
xlsxExtractor
```

under the ingestion service.

The routing layer therefore represents a **future extractor boundary**, not evidence that those advanced extractors are currently implemented.

---

## 4. Extraction persistence model

File: `services/api/src/db/schema.sql`

Current `file_extractions` stores:

- `file_id`
- `extracted_text`
- `extraction_status`
- `extractor_name`
- `extracted_at`
- `error_message`
- `metadata_json`

This is a useful extensibility point.

### Strength

`metadata_json` allows future structured extraction metadata to be introduced without immediately replacing the local SQLite MVP.

### Limitation

The primary persisted extraction payload remains a single `extracted_text` field. There is no first-class table in this base extraction schema for:

- page objects;
- blocks;
- paragraphs;
- table cells;
- figures;
- captions;
- bounding boxes;
- OCR confidence;
- regions;
- reading order.

---

## 5. Current chunk and citation capability

EverythingAI already has a strong text-evidence layer in the Wiki subsystem.

### 5.1 Text chunk creation

`knowledgeService.js` creates source chunks from flattened extracted text.

Chunks include:

- source reference;
- chunk number;
- line start/end;
- character start/end;
- text;
- evidence snippet;
- inferred heading flag;
- human-readable location.

### 5.2 Durable chunk persistence

`wiki_source_chunks` supports:

- stable chunk key;
- text;
- evidence;
- location;
- line start/end;
- character start/end;
- nullable `page_number`;
- content hash.

This is a strong base for future structured evidence.

### 5.3 Page-number enrichment hook

File: `services/api/src/knowledge/sourcePageMetadata.js`

The Wiki chunk layer can enrich text chunks with page numbers when extraction metadata contains:

```text
metadata.page_map
or
metadata.pages
```

with page-level character ranges.

### Verified current gap

The active `documentExtractor.js` does not currently populate a PDF page map.

Therefore:

```text
page-number support exists downstream,
but the active extraction path normally does not supply the required page metadata.
```

This distinction is important: page provenance is **architecturally prepared**, but not fully delivered by current PDF extraction.

---

## 6. Current search/embedding implications

File: `services/api/src/embeddings/embeddingService.js`

Embedding generation currently uses:

```text
filename + extracted_text
```

at file level.

Verified current consequences:

- flattened extraction is the semantic-search source;
- layout relationships are not represented in embeddings;
- table coordinates/row-column semantics are not independently embedded;
- image/chart content contributes nothing unless another system converts it to text first;
- OCR-less scanned PDFs can provide little or no searchable content.

---

## 7. Current document-context API

File: `services/api/src/documents/documentContextService.js`

Current document context returns:

- indexed-file metadata;
- extraction status/error;
- extractor name;
- extracted timestamp;
- a truncated extracted-text preview;
- file-level source reference;
- insight record.

### Verified gap

The document-context shape does not expose:

- page/block tree;
- tables;
- figures;
- OCR regions;
- coordinates;
- confidence;
- visual references.

---

## 8. Capability matrix

| Capability | Current status | Repository evidence |
|---|---|---|
| Plain text extraction | Implemented | `documentExtractor.js` |
| Markdown extraction | Implemented as plain text | `documentExtractor.js` |
| CSV extraction | Implemented as plain text | `documentExtractor.js` |
| PDF text extraction | Implemented, flattened | `pdf-parse` in `documentExtractor.js` |
| DOCX text extraction | Implemented, flattened | `mammoth.extractRawText` |
| XLSX value extraction | Implemented, flattened rows | `read-excel-file` |
| PPTX MIME recognition | Present | `mimeDetectionService.js` |
| PPTX extraction | Not verified/implemented in active extractor | No active extractor evidence found |
| PNG/JPEG MIME recognition | Present | `mimeDetectionService.js` |
| Image OCR | Not verified/implemented | No OCR dependency/runtime extractor found |
| Scanned PDF OCR fallback | Not verified/implemented | PDF path uses `getText()` only |
| Page-aware PDF provenance | Prepared downstream, not supplied by active PDF extractor | `sourcePageMetadata.js` vs `documentExtractor.js` |
| Layout blocks / reading order | Not verified/implemented | Flattened text model |
| Native table extraction | Not verified/implemented | XLSX flattened; PDF/DOCX structured tables absent |
| Chart understanding | Not verified/implemented | No visual intelligence path found |
| Image understanding/captioning | Not verified/implemented | No image extractor implementation found |
| OCR confidence | Not implemented in inspected schema | No confidence model found |
| Bounding boxes/coordinates | Not implemented in inspected schema | No region geometry model found |
| Line/character evidence offsets | Implemented | Wiki source chunks |
| Durable chunk IDs | Implemented | `wiki_source_chunks` |
| Source-backed citations | Implemented | Wiki design/repository/service |
| File-level fingerprints | Implemented | indexing/archive foundations |
| Provider-neutral routing boundary | Partially prepared | ingestion extractor routing |

---

## 9. Verified gaps

### Gap A — scanned documents

A scanned PDF/image may produce empty or weak extracted text because there is no verified OCR fallback in the active API extractor.

### Gap B — page fidelity

The evidence layer can store `page_number`, but the current PDF extraction path does not produce the page-map metadata required for reliable mapping.

### Gap C — layout fidelity

Current extraction collapses content to text and therefore loses:

- columns;
- reading order;
- bounding boxes;
- headers/footers as regions;
- figure positions;
- visual grouping.

### Gap D — tables

Current XLSX extraction preserves values only as comma-separated text. PDF/DOCX table extraction is not represented structurally.

Future table reasoning therefore lacks stable row/column/cell identity.

### Gap E — charts and images

There is no verified runtime path that converts charts, diagrams, screenshots, or embedded images into evidence-bearing structured content.

### Gap F — extraction confidence

The current extraction contract does not expose confidence per page/block/region.

### Gap G — extractor-specific provenance

The current extraction result identifies `extractor_name`, but does not persist a first-class extraction version/model/provider/options contract for individual regions.

---

## 10. Existing strengths to preserve

Advanced document intelligence should build on, not replace, these accepted strengths:

1. **Local-first extraction** — ordinary local MVP operation must remain available.
2. **Provider neutrality** — no OCR/model vendor should become architectural truth.
3. **Stable source identity** — file IDs and fingerprints already exist.
4. **Durable evidence chunks** — Wiki chunks already have stable keys and offsets.
5. **Evidence-first UI** — citations/source inspection already exist.
6. **Fail-closed safety** — extraction failure must not trigger filesystem mutation.
7. **Phase 9 provenance discipline** — machine-generated content should retain generator/evidence provenance.
8. **No execution coupling** — richer extraction must not imply planning/execution authority.

---

## 11. Proposed future structured extraction contract

This is a **proposal**, not current capability.

A future extractor should return a provider-neutral envelope such as:

```text
DocumentExtraction
  file_id
  extractor_id
  extractor_version
  extraction_mode
  content_hash
  pages[]
  blocks[]
  tables[]
  figures[]
  plain_text
  warnings[]
```

Suggested page/block evidence:

```text
Page
  page_number
  width
  height
  text
  blocks[]

Block
  block_id
  type: paragraph | heading | list | table | figure | caption | header | footer
  text
  reading_order
  bbox
  confidence
  evidence_ref
```

Suggested table evidence:

```text
Table
  table_id
  page_number
  bbox
  rows
  columns
  cells[]
  extraction_confidence
```

Suggested visual evidence:

```text
Figure
  figure_id
  page_number
  bbox
  caption
  description
  generated_by
  evidence_refs
```

This shape should be additive and should continue to generate the existing `extracted_text` compatibility projection.

---

## 12. Recommended dependency order

### Recommended 10.2

Define the structured evidence/provenance contract **before selecting OCR or visual providers**.

Why:

- prevents provider lock-in;
- allows deterministic fixtures/tests;
- preserves current SQLite/local-first compatibility;
- gives the Wiki/search layers a stable target;
- makes provider comparison measurable.

### Recommended later implementation order

```text
A. Structured extraction envelope + compatibility adapter
B. Page-aware native PDF text extraction
C. OCR fallback for image-only PDF pages
D. Structured table extraction
E. Image/figure evidence records
F. Optional chart/image semantic enrichment
G. search/wiki adoption of structured regions
```

Each should be a separately gated implementation slice.

---

## 13. Risk matrix

| Risk | Impact | Required mitigation |
|---|---:|---|
| OCR hallucination / recognition error | High | confidence + source image/page evidence + visible provenance |
| Wrong reading order | High | page/block ordering model + fixtures |
| Table cell misalignment | High | cell coordinates + row/column identity + deterministic test PDFs |
| Provider lock-in | High | provider-neutral extraction contract |
| Large PDF memory/CPU usage | High | page-bounded processing + limits + cancellation |
| Secret/sensitive visual content sent remotely | High | local-first default + explicit provider policy/consent |
| Citation drift | High | stable region IDs + source fingerprint binding |
| Duplicate text from OCR + native layer | Medium | native-text/OCR arbitration |
| Regression of current text search | High | compatibility `plain_text` projection |
| Silent filesystem side effects | Critical | extraction remains read-only |

---

## 14. Phase 10.1 conclusion

### Verified current state

EverythingAI is already strong at:

```text
file indexing
text extraction
source fingerprints
text search
file-level embeddings
durable Wiki chunks
source-backed citations
line/character provenance
optional downstream page-number mapping
```

### Verified missing advanced intelligence

Repository evidence does not currently demonstrate:

```text
OCR fallback
page/block layout extraction
bounding boxes
structured PDF/DOCX tables
chart understanding
image understanding
OCR confidence
region-level visual provenance
```

### Recommendation

Proceed to **Phase 10.2 — Evidence/Provenance Contract for Structured Document Intelligence**.

Do **not** choose or integrate an OCR/model provider yet.

The first implementation-quality artifact should define a provider-neutral, read-only structured extraction envelope with page/block/table/figure evidence and a backwards-compatible `extracted_text` projection.

---

## Authority statement

This report grants no new runtime authority.

It does not authorize:

- OCR/model provider invocation;
- remote document upload;
- provider-specific integration;
- filesystem mutation;
- archive overwrite;
- automatic approval/execution;
- broad-drive watch;
- destructive migrations;
- production infrastructure activation;
- certification/SLA commitments.

Phase 10 remains a research/architecture phase until separately gated implementation work is explicitly accepted.
