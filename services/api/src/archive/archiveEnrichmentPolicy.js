import { validateArchiveProfile } from './archiveProfileModel.js';

const ALLOWED_FIELDS = Object.freeze(['classification', 'summary', 'tags']);
const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|cookie|authorization|credential)/i;
const SECRET_URL = /(?:[?&](?:token|key|api_key|secret|password)=)|(?:https?:\/\/[^\s/@:]+:[^\s/@]+@)/i;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function assertSafeValue(value, path = 'generated_metadata') {
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

function normalizeEvidenceRefs(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`AI_EVIDENCE_REQUIRED:${field}`);
  }

  const normalized = value.map((entry) => {
    const type = normalizeString(entry?.type);
    const sourcePath = normalizeString(entry?.source_path);
    const locator = normalizeString(entry?.locator);

    if (!type || !sourcePath) {
      throw new Error(`INVALID_AI_EVIDENCE:${field}`);
    }

    return {
      type,
      source_path: sourcePath,
      locator,
    };
  });

  const deduped = new Map();
  for (const entry of normalized) {
    const key = JSON.stringify([entry.type, entry.source_path, entry.locator]);
    deduped.set(key, entry);
  }

  return [...deduped.values()]
    .sort((a, b) => (
      a.source_path.localeCompare(b.source_path)
      || a.type.localeCompare(b.type)
      || a.locator.localeCompare(b.locator)
    ))
    .map((entry) => Object.freeze(entry));
}

function normalizeFieldValue(field, value) {
  if (field === 'tags') {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('ENRICHMENT_VALUE_REQUIRED:tags');
    }

    const tags = value.map((tag) => {
      const normalized = normalizeString(tag);
      if (!normalized) throw new Error('INVALID_ENRICHMENT_TAG');
      return normalized;
    });

    return Object.freeze([...new Set(tags)].sort((a, b) => a.localeCompare(b)));
  }

  const normalized = normalizeString(value);
  if (!normalized) throw new Error(`ENRICHMENT_VALUE_REQUIRED:${field}`);
  return normalized;
}

function normalizeGeneratedField(field, entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`INVALID_ENRICHMENT_FIELD:${field}`);
  }

  assertSafeValue(entry, `generated_metadata.${field}`);

  const generatedBy = normalizeString(entry.generated_by);
  if (!generatedBy) throw new Error(`GENERATED_BY_REQUIRED:${field}`);

  const evidenceRefs = normalizeEvidenceRefs(entry.evidence_refs, field);

  return Object.freeze({
    value: normalizeFieldValue(field, entry.value),
    generated_by: generatedBy,
    ai_generated: true,
    evidence_refs: Object.freeze(evidenceRefs),
  });
}

export function normalizeArchiveEnrichment({ profile: inputProfile, generated_metadata: generatedMetadata = {} } = {}) {
  const validation = validateArchiveProfile(inputProfile);
  if (!validation.valid) {
    const error = new Error('INVALID_ARCHIVE_PROFILE');
    error.validation = validation;
    throw error;
  }

  if (!generatedMetadata || typeof generatedMetadata !== 'object' || Array.isArray(generatedMetadata)) {
    throw new Error('INVALID_GENERATED_METADATA');
  }

  assertSafeValue(generatedMetadata);

  const fieldNames = Object.keys(generatedMetadata);
  const enabled = validation.profile.metadata_enrichment_enabled === true;

  if (!enabled && fieldNames.length > 0) {
    throw new Error('AI_ENRICHMENT_DISABLED');
  }

  const metadata = {};
  for (const field of fieldNames.sort((a, b) => a.localeCompare(b))) {
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new Error(`ENRICHMENT_FIELD_NOT_ALLOWED:${field}`);
    }
    metadata[field] = normalizeGeneratedField(field, generatedMetadata[field]);
  }

  return Object.freeze({
    enabled,
    status: enabled ? 'ready' : 'disabled',
    provider_neutral: true,
    allowed_fields: ALLOWED_FIELDS,
    metadata: Object.freeze(metadata),
    filesystem_mutation_allowed: false,
    execution_allowed: false,
    automatic_approval_allowed: false,
  });
}

export const archiveEnrichmentPolicy = Object.freeze({
  provider_neutral: true,
  allowed_fields: ALLOWED_FIELDS,
  requires_field_provenance: true,
  requires_evidence_refs: true,
  filesystem_mutation_allowed: false,
  execution_allowed: false,
  automatic_approval_allowed: false,
});
