-- EverythingAI Phase 3.3 durable object metadata foundation
--
-- Production-only additive migration. Existing local-first SQLite/filesystem
-- behavior remains unchanged. This migration stores metadata only; it does not
-- copy, delete, or cut over any document bytes.

CREATE TABLE IF NOT EXISTS workspace_object_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  storage_adapter TEXT NOT NULL CHECK (storage_adapter IN ('local-object-storage', 's3-compatible')),
  storage_key TEXT NOT NULL,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  checksum_sha256 TEXT CHECK (
    checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  checksum_verified BOOLEAN NOT NULL DEFAULT FALSE,
  content_type TEXT,
  migration_state TEXT NOT NULL DEFAULT 'planned'
    CHECK (migration_state IN ('planned', 'copied', 'verified', 'cutover', 'rollback-required')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, workspace_id, object_id),
  UNIQUE (tenant_id, workspace_id, storage_key),
  CHECK (checksum_verified = FALSE OR checksum_sha256 IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_workspace_object_metadata_scope_state
  ON workspace_object_metadata(tenant_id, workspace_id, migration_state);

ALTER TABLE workspace_object_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_object_metadata FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eai_workspace_object_metadata_scope ON workspace_object_metadata;
CREATE POLICY eai_workspace_object_metadata_scope ON workspace_object_metadata
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id = eai_runtime.current_workspace_id()
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id = eai_runtime.current_workspace_id()
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  );

-- Rollback boundary:
--   DROP POLICY eai_workspace_object_metadata_scope ON workspace_object_metadata;
--   DROP TABLE workspace_object_metadata;
-- No existing document storage location is changed by this migration.