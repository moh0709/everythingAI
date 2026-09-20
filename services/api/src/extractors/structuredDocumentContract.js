import crypto from 'node:crypto';

const EXTRACTION_MODES = new Set([
  'native_text',
  'ocr',
  'hybrid',
  'structured_native',
  'visual_inference',
]);

const EVIDENCE_MODES = new Set([
  'native',
  'ocr',
  'derived',
  'visual_inference',
]);

const BLOCK_TYPES = new Set([
  'heading',
  'paragraph',
  'list',
  'list_item',
  'table',
  'figure',
  'caption',
  'header',
  'footer',
  'footnote',
  'unknown',
]);

const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|cookie|authorization|credential)/i;
const SECRET_URL = /(?:[?&](?:token|key|api_key|secret|password)=)|(?:https?:\/\/[^\s/@:]+:[^\s/@]+@)/i;

function requireString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function assertSafeValue(value, path = 'structured_extraction') {
  if (typeof value === 'string' && SECRET_URL.test(value)) {
    throw new Error(`SECRET_BEARING_VALUE_FORBIDDEN:${path}`);
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`SENSITIVE_FIELD_FORBIDDEN:${path}.${key}`);
    }
    assertSafeValue(child, `${path}.${key}`);
  }
}

function normalizeFingerprint(value) {
  const hash = requireString(value?.hash, 'SOURCE_FINGERPRINT_HASH_REQUIRED');
  const sizeBytes = value?.size_bytes;
  const mtimeMs = value?.mtime_ms;

  if (!Number.isInteger(sizeBytes) || sizeBytes < 0 || !Number.isFinite(mtimeMs)) {
    throw new Error('INVALID_SOURCE_FINGERPRINT');
  }

  return Object.freeze({ hash, size_bytes: sizeBytes, mtime_ms: mtimeMs });
}

function normalizeExtractor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('EXTRACTOR_REQUIRED');
  }

  const provider = value.provider == null ? null : requireString(value.provider, 'INVALID_EXTRACTOR_PROVIDER');
  const model = value.model == null ? null : requireString(value.model, 'INVALID_EXTRACTOR_MODEL');
  const configurationHash = value.configuration_hash == null
    ? null
    : requireString(value.configuration_hash, 'INVALID_EXTRACTOR_CONFIGURATION_HASH');

  return Object.freeze({
    id: requireString(value.id, 'EXTRACTOR_ID_REQUIRED'),
    version: requireString(value.version, 'EXTRACTOR_VERSION_REQUIRED'),
    provider,
    model,
    configuration_hash: configurationHash,
    local: value.local === true,
  });
}

function normalizeBbox(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('INVALID_NORMALIZED_BBOX');
  }

  const { x, y, width, height } = value;
  const valid = [x, y, width, height].every((entry) => Number.isFinite(entry))
    && x >= 0 && y >= 0 && width >= 0 && height >= 0
    && x <= 1 && y <= 1 && width <= 1 && height <= 1
    && x + width <= 1 + Number.EPSILON
    && y + height <= 1 + Number.EPSILON
    && value.coordinate_space === 'normalized_0_1';

  if (!valid) throw new Error('INVALID_NORMALIZED_BBOX');

  return Object.freeze({
    x,
    y,
    width,
    height,
    coordinate_space: 'normalized_0_1',
  });
}

function normalizeConfidence(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('INVALID_CONFIDENCE');
  }

  const number = value.value;
  const scale = requireString(value.scale, 'INVALID_CONFIDENCE');
  const source = requireString(value.source, 'INVALID_CONFIDENCE');

  if (!Number.isFinite(number)) throw new Error('INVALID_CONFIDENCE');
  if (scale === '0_1' && (number < 0 || number > 1)) throw new Error('INVALID_CONFIDENCE');

  return Object.freeze({ value: number, scale, source });
}

function requireEvidenceMode(value) {
  if (!EVIDENCE_MODES.has(value)) throw new Error(`INVALID_EVIDENCE_MODE:${value ?? ''}`);
  return value;
}

function uniqueId(registry, id) {
  if (registry.has(id)) throw new Error(`DUPLICATE_STRUCTURED_ID:${id}`);
  registry.add(id);
  return id;
}

function freezeArray(items) {
  return Object.freeze(items);
}

export function createStructuredEvidenceId({
  file_id,
  source_fingerprint_hash,
  evidence_kind,
  page_number,
  stable_position_key,
  normalized_content_prefix,
} = {}) {
  const contract = [
    requireString(file_id, 'EVIDENCE_FILE_ID_REQUIRED'),
    requireString(source_fingerprint_hash, 'EVIDENCE_SOURCE_FINGERPRINT_REQUIRED'),
    requireString(evidence_kind, 'EVIDENCE_KIND_REQUIRED'),
    Number.isInteger(page_number) ? page_number : null,
    requireString(stable_position_key, 'EVIDENCE_POSITION_REQUIRED'),
    typeof normalized_content_prefix === 'string' ? normalized_content_prefix.trim() : '',
  ];

  const digest = crypto.createHash('sha256')
    .update(JSON.stringify(contract))
    .digest('hex')
    .slice(0, 24);

  return `evidence_${digest}`;
}

export function normalizeStructuredDocumentExtraction(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('STRUCTURED_EXTRACTION_REQUIRED');
  }

  assertSafeValue(input);

  if (
    input.filesystem_mutation_allowed !== false
    || input.execution_allowed !== false
    || input.automatic_approval_allowed !== false
  ) {
    throw new Error('STRUCTURED_EXTRACTION_AUTHORITY_FORBIDDEN');
  }

  const schemaVersion = requireString(input.schema_version, 'SCHEMA_VERSION_REQUIRED');
  const fileId = requireString(input.file_id, 'FILE_ID_REQUIRED');
  const sourcePath = requireString(input.source_path, 'SOURCE_PATH_REQUIRED');
  const sourceFingerprint = normalizeFingerprint(input.source_fingerprint);
  const extractor = normalizeExtractor(input.extractor);
  const extractionMode = requireString(input.extraction_mode, 'EXTRACTION_MODE_REQUIRED');
  if (!EXTRACTION_MODES.has(extractionMode)) {
    throw new Error(`INVALID_EXTRACTION_MODE:${extractionMode}`);
  }

  const status = requireString(input.status, 'EXTRACTION_STATUS_REQUIRED');
  const plainText = typeof input.plain_text === 'string' ? input.plain_text : (() => {
    throw new Error('PLAIN_TEXT_REQUIRED');
  })();

  const ids = new Set();
  const pagesInput = Array.isArray(input.pages) ? input.pages : [];
  const blocksInput = Array.isArray(input.blocks) ? input.blocks : [];
  const tablesInput = Array.isArray(input.tables) ? input.tables : [];
  const figuresInput = Array.isArray(input.figures) ? input.figures : [];
  const warningsInput = Array.isArray(input.warnings) ? input.warnings : [];

  const pages = pagesInput.map((page) => {
    const pageId = uniqueId(ids, requireString(page?.page_id, 'PAGE_ID_REQUIRED'));
    if (!Number.isInteger(page.page_number) || page.page_number < 1) throw new Error('INVALID_PAGE_NUMBER');

    return Object.freeze({
      page_id: pageId,
      page_number: page.page_number,
      width: Number.isFinite(page.width) ? page.width : null,
      height: Number.isFinite(page.height) ? page.height : null,
      unit: page.unit ?? null,
      rotation: Number.isFinite(page.rotation) ? page.rotation : 0,
      native_text_available: page.native_text_available === true,
      native_text_character_count: Number.isInteger(page.native_text_character_count)
        ? page.native_text_character_count
        : null,
      ocr_used: page.ocr_used === true,
      ocr_reason: page.ocr_reason ?? null,
      block_ids: freezeArray(Array.isArray(page.block_ids)
        ? page.block_ids.map((id) => requireString(id, 'INVALID_BLOCK_REFERENCE'))
        : []),
      evidence_mode: requireEvidenceMode(page.evidence_mode),
    });
  });

  const pageIds = new Set(pages.map((page) => page.page_id));
  const blocks = blocksInput.map((block) => {
    const blockId = uniqueId(ids, requireString(block?.block_id, 'BLOCK_ID_REQUIRED'));
    const pageId = requireString(block?.page_id, 'BLOCK_PAGE_ID_REQUIRED');
    if (!pageIds.has(pageId)) throw new Error(`UNKNOWN_PAGE_REFERENCE:${pageId}`);

    const blockType = requireString(block.block_type, 'BLOCK_TYPE_REQUIRED');
    if (!BLOCK_TYPES.has(blockType)) throw new Error(`INVALID_BLOCK_TYPE:${blockType}`);

    const page = pages.find((entry) => entry.page_id === pageId);
    const evidenceId = createStructuredEvidenceId({
      file_id: fileId,
      source_fingerprint_hash: sourceFingerprint.hash,
      evidence_kind: 'block',
      page_number: page.page_number,
      stable_position_key: `${blockType}:${block.reading_order ?? ''}:${blockId}`,
      normalized_content_prefix: typeof block.text === 'string' ? block.text.slice(0, 120).trim() : '',
    });

    return Object.freeze({
      block_id: blockId,
      evidence_id: evidenceId,
      page_id: pageId,
      block_type: blockType,
      reading_order: Number.isFinite(block.reading_order) ? block.reading_order : null,
      bbox: normalizeBbox(block.bbox),
      text: typeof block.text === 'string' ? block.text : '',
      evidence_mode: requireEvidenceMode(block.evidence_mode),
      confidence: normalizeConfidence(block.confidence),
      native_object_ref: block.native_object_ref ?? null,
      parent_block_id: block.parent_block_id ?? null,
      child_block_ids: freezeArray(Array.isArray(block.child_block_ids) ? [...block.child_block_ids] : []),
    });
  });

  const blockIds = new Set(blocks.map((block) => block.block_id));
  for (const page of pages) {
    for (const blockId of page.block_ids) {
      if (!blockIds.has(blockId)) throw new Error(`UNKNOWN_BLOCK_REFERENCE:${blockId}`);
    }
  }
  for (const block of blocks) {
    if (block.parent_block_id && !blockIds.has(block.parent_block_id)) {
      throw new Error(`UNKNOWN_BLOCK_REFERENCE:${block.parent_block_id}`);
    }
    for (const childId of block.child_block_ids) {
      if (!blockIds.has(childId)) throw new Error(`UNKNOWN_BLOCK_REFERENCE:${childId}`);
    }
  }

  const tables = tablesInput.map((table) => {
    const tableId = uniqueId(ids, requireString(table?.table_id, 'TABLE_ID_REQUIRED'));
    const pageId = requireString(table?.page_id, 'TABLE_PAGE_ID_REQUIRED');
    if (!pageIds.has(pageId)) throw new Error(`UNKNOWN_PAGE_REFERENCE:${pageId}`);
    if (!Number.isInteger(table.row_count) || table.row_count < 0
      || !Number.isInteger(table.column_count) || table.column_count < 0) {
      throw new Error('INVALID_TABLE_DIMENSIONS');
    }

    const cells = (Array.isArray(table.cells) ? table.cells : []).map((cell) => {
      const cellId = uniqueId(ids, requireString(cell?.cell_id, 'CELL_ID_REQUIRED'));
      if (!Number.isInteger(cell.row_index) || cell.row_index < 0
        || !Number.isInteger(cell.column_index) || cell.column_index < 0
        || !Number.isInteger(cell.row_span) || cell.row_span < 1
        || !Number.isInteger(cell.column_span) || cell.column_span < 1) {
        throw new Error('INVALID_TABLE_CELL_POSITION');
      }

      return Object.freeze({
        cell_id: cellId,
        row_index: cell.row_index,
        column_index: cell.column_index,
        row_span: cell.row_span,
        column_span: cell.column_span,
        text: typeof cell.text === 'string' ? cell.text : '',
        bbox: normalizeBbox(cell.bbox),
        evidence_mode: requireEvidenceMode(cell.evidence_mode),
        confidence: normalizeConfidence(cell.confidence),
      });
    });

    const page = pages.find((entry) => entry.page_id === pageId);
    return Object.freeze({
      table_id: tableId,
      evidence_id: createStructuredEvidenceId({
        file_id: fileId,
        source_fingerprint_hash: sourceFingerprint.hash,
        evidence_kind: 'table',
        page_number: page.page_number,
        stable_position_key: tableId,
        normalized_content_prefix: cells.map((cell) => cell.text).join('|').slice(0, 120),
      }),
      page_id: pageId,
      bbox: normalizeBbox(table.bbox),
      title: typeof table.title === 'string' ? table.title : '',
      row_count: table.row_count,
      column_count: table.column_count,
      cells: freezeArray(cells),
      evidence_mode: requireEvidenceMode(table.evidence_mode),
      confidence: normalizeConfidence(table.confidence),
    });
  });

  const figures = figuresInput.map((figure) => {
    const figureId = uniqueId(ids, requireString(figure?.figure_id, 'FIGURE_ID_REQUIRED'));
    const pageId = requireString(figure?.page_id, 'FIGURE_PAGE_ID_REQUIRED');
    if (!pageIds.has(pageId)) throw new Error(`UNKNOWN_PAGE_REFERENCE:${pageId}`);
    const page = pages.find((entry) => entry.page_id === pageId);

    return Object.freeze({
      figure_id: figureId,
      evidence_id: createStructuredEvidenceId({
        file_id: fileId,
        source_fingerprint_hash: sourceFingerprint.hash,
        evidence_kind: 'figure',
        page_number: page.page_number,
        stable_position_key: figureId,
        normalized_content_prefix: typeof figure.native_caption === 'string' ? figure.native_caption.slice(0, 120) : '',
      }),
      page_id: pageId,
      bbox: normalizeBbox(figure.bbox),
      figure_type: requireString(figure.figure_type, 'FIGURE_TYPE_REQUIRED'),
      native_caption: figure.native_caption ?? null,
      generated_description: figure.generated_description ?? null,
      evidence_mode: requireEvidenceMode(figure.evidence_mode),
      confidence: normalizeConfidence(figure.confidence),
      provenance: figure.provenance ?? null,
    });
  });

  const warnings = warningsInput.map((warning) => {
    const pageId = warning?.page_id ?? null;
    if (pageId && !pageIds.has(pageId)) throw new Error(`UNKNOWN_PAGE_REFERENCE:${pageId}`);
    return Object.freeze({
      code: requireString(warning?.code, 'WARNING_CODE_REQUIRED'),
      severity: requireString(warning?.severity, 'WARNING_SEVERITY_REQUIRED'),
      page_id: pageId,
      evidence_id: warning?.evidence_id ?? null,
      message: requireString(warning?.message, 'WARNING_MESSAGE_REQUIRED'),
    });
  });

  return Object.freeze({
    schema_version: schemaVersion,
    file_id: fileId,
    source_path: sourcePath,
    source_fingerprint: sourceFingerprint,
    mime_type: input.mime_type ?? null,
    extractor,
    extraction_mode: extractionMode,
    extracted_at: input.extracted_at ?? null,
    status,
    pages: freezeArray(pages),
    blocks: freezeArray(blocks),
    tables: freezeArray(tables),
    figures: freezeArray(figures),
    warnings: freezeArray(warnings),
    plain_text: plainText,
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const structuredDocumentContract = Object.freeze({
  schema_version: '1.0',
  extraction_modes: Object.freeze([...EXTRACTION_MODES]),
  evidence_modes: Object.freeze([...EVIDENCE_MODES]),
  provider_neutral: true,
  model_execution_required: false,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
