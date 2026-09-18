import fs from 'node:fs/promises';

const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|cookie|authorization|credential)/i;
const SECRET_URL = /(?:[?&](?:token|key|api_key|secret|password)=)|(?:https?:\/\/[^\s/@:]+:[^\s/@]+@)/i;
const BOUNDED_METADATA_FIELDS = Object.freeze(['classification', 'summary', 'tags']);

function assertSafeValue(value, path = 'metadata') {
  if (typeof value === 'string' && SECRET_URL.test(value)) {
    throw new Error(`SECRET_BEARING_VALUE_FORBIDDEN:${path}`);
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) throw new Error(`SENSITIVE_FIELD_FORBIDDEN:${path}.${key}`);
    assertSafeValue(child, `${path}.${key}`);
  }
}

function requireString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
}

function normalizeBoundedValue(field, value, prefix = 'METADATA') {
  if (field === 'tags') {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${prefix}_VALUE_REQUIRED:tags`);
    }

    const tags = value.map((tag) => {
      const normalized = typeof tag === 'string' ? tag.trim() : '';
      if (!normalized) throw new Error(`INVALID_${prefix}_TAG`);
      return normalized;
    });

    return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${prefix}_VALUE_REQUIRED:${field}`);
  }
  return value.trim();
}

function normalizeMetadataEntries(metadata) {
  assertSafeValue(metadata);
  const normalized = {};

  for (const [field, entry] of Object.entries(metadata)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`METADATA_PROVENANCE_REQUIRED:${field}`);
    }
    if (entry.ai_generated === true && (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0)) {
      throw new Error(`AI_EVIDENCE_REQUIRED:${field}`);
    }
    if (entry.ai_generated === true && (typeof entry.generated_by !== 'string' || !entry.generated_by.trim())) {
      throw new Error(`GENERATED_BY_REQUIRED:${field}`);
    }

    normalized[field] = {
      value: entry.value,
      generated_by: entry.generated_by || null,
      ai_generated: entry.ai_generated === true,
      evidence_refs: Array.isArray(entry.evidence_refs) ? entry.evidence_refs : [],
      user_provenance: entry.user_provenance ?? null,
    };
  }

  return normalized;
}

function metadataFromPlanItem(planItem, executionPlanItemId) {
  if (!planItem) return null;
  if (typeof planItem !== 'object' || Array.isArray(planItem)) throw new Error('INVALID_PLAN_ITEM');
  if (planItem.plan_item_id !== executionPlanItemId) throw new Error('PLAN_ITEM_SCOPE_MISMATCH');

  const enrichment = planItem.enrichment;
  if (!enrichment || typeof enrichment !== 'object') return {};

  if (
    enrichment.filesystem_mutation_allowed !== false
    || enrichment.execution_allowed !== false
    || enrichment.automatic_approval_allowed !== false
  ) {
    throw new Error('UNSAFE_ENRICHMENT_AUTHORITY');
  }

  const metadata = enrichment.metadata ?? {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('INVALID_PLAN_ENRICHMENT_METADATA');
  }

  return metadata;
}

function applyUserMetadata(baseMetadata, userMetadata = {}) {
  if (!userMetadata || typeof userMetadata !== 'object' || Array.isArray(userMetadata)) {
    throw new Error('INVALID_USER_METADATA');
  }

  assertSafeValue(userMetadata, 'user_metadata');
  const merged = { ...baseMetadata };

  for (const [field, edit] of Object.entries(userMetadata)) {
    if (!BOUNDED_METADATA_FIELDS.includes(field)) {
      throw new Error(`USER_METADATA_FIELD_NOT_ALLOWED:${field}`);
    }
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) {
      throw new Error(`USER_METADATA_PROVENANCE_REQUIRED:${field}`);
    }

    const editedBy = requireString(edit.edited_by, `EDITED_BY_REQUIRED:${field}`);
    const editedAt = requireString(edit.edited_at, `EDITED_AT_REQUIRED:${field}`);
    const previous = merged[field] ?? null;

    merged[field] = {
      value: normalizeBoundedValue(field, edit.value, 'USER_METADATA'),
      generated_by: null,
      ai_generated: false,
      evidence_refs: [],
      user_provenance: {
        edited_by: editedBy,
        edited_at: editedAt,
        replaced_ai_generated: previous?.ai_generated === true,
        prior_generated_by: previous?.ai_generated === true ? previous.generated_by : null,
        prior_evidence_refs: previous?.ai_generated === true ? previous.evidence_refs : [],
      },
    };
  }

  return merged;
}

export function buildMetadataSidecar({
  execution,
  metadata = {},
  plan_item: planItem = null,
  user_metadata: userMetadata = {},
  approval,
  created_at,
  updated_at,
} = {}) {
  if (!execution || execution.status !== 'copied') throw new Error('ACCEPTED_EXECUTION_REQUIRED');

  const sourcePath = requireString(execution.source_path, 'SOURCE_PATH_REQUIRED');
  const archivePath = requireString(execution.archive_path, 'ARCHIVE_PATH_REQUIRED');
  const planId = requireString(execution.plan_id, 'PLAN_ID_REQUIRED');
  const planItemId = requireString(execution.plan_item_id, 'PLAN_ITEM_ID_REQUIRED');
  const executionId = requireString(execution.execution_id, 'EXECUTION_ID_REQUIRED');

  if (!execution.source_fingerprint?.hash || !execution.archive_fingerprint?.hash) {
    throw new Error('FINGERPRINT_EVIDENCE_REQUIRED');
  }

  if (!approval || approval.approved !== true) throw new Error('EXACT_APPROVAL_REQUIRED');
  if (approval.plan_id !== planId || approval.plan_item_id !== planItemId) {
    throw new Error('APPROVAL_SCOPE_MISMATCH');
  }

  assertSafeValue(approval);

  const planMetadata = metadataFromPlanItem(planItem, planItemId);
  const explicitMetadataProvided = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    && Object.keys(metadata).length > 0;

  if (planMetadata !== null && explicitMetadataProvided) {
    throw new Error('METADATA_SOURCE_AMBIGUOUS');
  }

  const baseMetadata = planMetadata === null ? metadata : planMetadata;
  const normalizedBase = normalizeMetadataEntries(baseMetadata ?? {});
  const normalizedMetadata = applyUserMetadata(normalizedBase, userMetadata);

  return {
    source_path: sourcePath,
    archive_path: archivePath,
    source_fingerprint: execution.source_fingerprint,
    archive_fingerprint: execution.archive_fingerprint,
    metadata: normalizedMetadata,
    approval: {
      approved_by: requireString(approval.approved_by, 'APPROVED_BY_REQUIRED'),
      approved_at: requireString(approval.approved_at, 'APPROVED_AT_REQUIRED'),
      plan_id: planId,
      plan_item_id: planItemId,
      execution_batch_id: executionId,
    },
    created_at: requireString(created_at, 'CREATED_AT_REQUIRED'),
    updated_at: requireString(updated_at || created_at, 'UPDATED_AT_REQUIRED'),
  };
}

export async function writeMetadataSidecar(input = {}) {
  const sidecar = buildMetadataSidecar(input);
  const sidecarPath = `${sidecar.archive_path}.everythingai.json`;
  const handle = await fs.open(sidecarPath, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(sidecar, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  return { sidecar_path: sidecarPath, sidecar };
}
