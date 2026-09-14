import fs from 'node:fs/promises';

const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|cookie|authorization|credential)/i;
const SECRET_URL = /(?:[?&](?:token|key|api_key|secret|password)=)|(?:https?:\/\/[^\s/@:]+:[^\s/@]+@)/i;

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

export function buildMetadataSidecar({ execution, metadata = {}, approval, created_at, updated_at } = {}) {
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

  assertSafeValue(metadata);
  assertSafeValue(approval);

  const normalizedMetadata = {};
  for (const [field, entry] of Object.entries(metadata)) {
    if (!entry || typeof entry !== 'object') throw new Error(`METADATA_PROVENANCE_REQUIRED:${field}`);
    if (entry.ai_generated === true && (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0)) {
      throw new Error(`AI_EVIDENCE_REQUIRED:${field}`);
    }
    normalizedMetadata[field] = {
      value: entry.value,
      generated_by: entry.generated_by || null,
      ai_generated: entry.ai_generated === true,
      evidence_refs: Array.isArray(entry.evidence_refs) ? entry.evidence_refs : [],
    };
  }

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
