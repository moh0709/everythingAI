import { buildScopedObjectKey } from '../../storage/objectStorage.js';
import { withEnterpriseScopedTransaction } from './enterpriseScopedTransaction.js';

const SHA256_HEX = /^[0-9a-f]{64}$/;

function assertClient(client) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('A PostgreSQL client with query(sql, params) is required.');
  }
}

function normalizeStorageAdapter(value) {
  if (value === 'local-object-storage' || value === 's3-compatible') return value;
  throw new Error('Unsupported object storage adapter');
}

function normalizeOptionalSize(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Object size must be a non-negative safe integer');
  }
  return value;
}

function normalizeContentType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error('Object content type must be a string');
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeComputedPlanChecksum(value) {
  if (typeof value !== 'string') {
    throw new Error('Computed migration plan checksum is required');
  }
  const normalized = value.trim().toLowerCase();
  if (!SHA256_HEX.test(normalized)) {
    throw new Error('Computed migration plan checksum must be a SHA-256 hex digest');
  }
  return normalized;
}

function mapRow(row) {
  if (!row) return null;
  return {
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    objectId: row.object_id,
    storageAdapter: row.storage_adapter,
    storageKey: row.storage_key,
    size: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
    checksumSha256: row.checksum_sha256 ?? null,
    checksumVerified: row.checksum_verified === true,
    contentType: row.content_type ?? null,
    migrationState: row.migration_state,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function createPostgresObjectMetadataRepository({ client } = {}) {
  assertClient(client);

  return {
    repositoryType: 'postgres-object-metadata',

    async recordPlannedObject({
      scope,
      objectId,
      storageAdapter,
      size = null,
      contentType = null,
    } = {}) {
      const storageKey = buildScopedObjectKey(scope, objectId);
      const normalizedAdapter = normalizeStorageAdapter(storageAdapter);
      const normalizedSize = normalizeOptionalSize(size);
      const normalizedContentType = normalizeContentType(contentType);

      return withEnterpriseScopedTransaction(client, scope, async (scopedClient, exactScope) => {
        const result = await scopedClient.query(
          `INSERT INTO workspace_object_metadata (
             tenant_id,
             workspace_id,
             object_id,
             storage_adapter,
             storage_key,
             size_bytes,
             checksum_sha256,
             checksum_verified,
             content_type,
             migration_state,
             updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, NULL, FALSE, $7, 'planned', now())
           ON CONFLICT (tenant_id, workspace_id, object_id)
           DO UPDATE SET
             storage_adapter = EXCLUDED.storage_adapter,
             storage_key = EXCLUDED.storage_key,
             size_bytes = EXCLUDED.size_bytes,
             checksum_sha256 = NULL,
             checksum_verified = FALSE,
             content_type = EXCLUDED.content_type,
             migration_state = 'planned',
             updated_at = now()
           RETURNING *`,
          [
            exactScope.tenantId,
            exactScope.workspaceId,
            objectId,
            normalizedAdapter,
            storageKey,
            normalizedSize,
            normalizedContentType,
          ],
        );
        return mapRow(result.rows?.[0]);
      });
    },

    async recordComputedPlanObject({ scope, storageAdapter, planItem } = {}) {
      if (!planItem || typeof planItem !== 'object') {
        throw new Error('Computed migration plan item is required');
      }
      if (planItem.checksumComputedForPlan !== true) {
        throw new Error('Migration plan checksum must be computed for the plan');
      }
      if (planItem.checksumVerifiedForCutover !== false) {
        throw new Error('Migration plan checksum must remain unverified for cutover');
      }
      if (planItem.migrationState !== undefined && planItem.migrationState !== 'planned') {
        throw new Error('Computed migration metadata may only be recorded in planned state');
      }

      const objectId = planItem.objectId;
      const storageKey = buildScopedObjectKey(scope, objectId);
      const normalizedAdapter = normalizeStorageAdapter(storageAdapter);
      const normalizedSize = normalizeOptionalSize(planItem.size);
      const normalizedChecksum = normalizeComputedPlanChecksum(planItem.checksumSha256);
      const normalizedContentType = normalizeContentType(planItem.contentType);

      return withEnterpriseScopedTransaction(client, scope, async (scopedClient, exactScope) => {
        const result = await scopedClient.query(
          `INSERT INTO workspace_object_metadata (
             tenant_id,
             workspace_id,
             object_id,
             storage_adapter,
             storage_key,
             size_bytes,
             checksum_sha256,
             checksum_verified,
             content_type,
             migration_state,
             updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, 'planned', now())
           ON CONFLICT (tenant_id, workspace_id, object_id)
           DO UPDATE SET
             storage_adapter = EXCLUDED.storage_adapter,
             storage_key = EXCLUDED.storage_key,
             size_bytes = EXCLUDED.size_bytes,
             checksum_sha256 = EXCLUDED.checksum_sha256,
             checksum_verified = FALSE,
             content_type = EXCLUDED.content_type,
             migration_state = 'planned',
             updated_at = now()
           RETURNING *`,
          [
            exactScope.tenantId,
            exactScope.workspaceId,
            objectId,
            normalizedAdapter,
            storageKey,
            normalizedSize,
            normalizedChecksum,
            normalizedContentType,
          ],
        );
        return mapRow(result.rows?.[0]);
      });
    },

    async getObject({ scope, objectId } = {}) {
      const storageKey = buildScopedObjectKey(scope, objectId);
      return withEnterpriseScopedTransaction(client, scope, async (scopedClient, exactScope) => {
        const result = await scopedClient.query(
          `SELECT *
           FROM workspace_object_metadata
           WHERE tenant_id = $1
             AND workspace_id = $2
             AND object_id = $3
             AND storage_key = $4
           LIMIT 1`,
          [exactScope.tenantId, exactScope.workspaceId, objectId, storageKey],
        );
        return mapRow(result.rows?.[0]);
      });
    },

    async listPlannedObjects({ scope } = {}) {
      return withEnterpriseScopedTransaction(client, scope, async (scopedClient, exactScope) => {
        const result = await scopedClient.query(
          `SELECT *
           FROM workspace_object_metadata
           WHERE tenant_id = $1
             AND workspace_id = $2
             AND migration_state = 'planned'
           ORDER BY object_id ASC`,
          [exactScope.tenantId, exactScope.workspaceId],
        );
        return (result.rows ?? []).map(mapRow);
      });
    },
  };
}
