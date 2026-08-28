-- EverythingAI Phase 3.1 enterprise isolation foundation
--
-- Production-only migration. The existing SQLite/local-first runtime is not
-- replaced or reconfigured by this migration.
--
-- Application contract:
--   Every production scoped transaction must set both values locally:
--     eai.tenant_id
--     eai.workspace_id
--   Missing values evaluate to NULL and therefore match no scoped row.
--
-- Rollback boundary:
--   Policies and RLS can be removed independently before dropping any helper
--   functions. This migration performs no data movement or destructive rewrite.

CREATE SCHEMA IF NOT EXISTS eai_runtime;

CREATE OR REPLACE FUNCTION eai_runtime.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('eai.tenant_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION eai_runtime.current_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('eai.workspace_id', true), '')::uuid;
$$;

-- Tenant-scoped membership records.
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_tenant_memberships_scope ON tenant_memberships;
CREATE POLICY eai_tenant_memberships_scope ON tenant_memberships
  USING (tenant_id = eai_runtime.current_tenant_id())
  WITH CHECK (tenant_id = eai_runtime.current_tenant_id());

-- Workspaces must belong to the current tenant and the selected workspace.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspaces_scope ON workspaces;
CREATE POLICY eai_workspaces_scope ON workspaces
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND id = eai_runtime.current_workspace_id()
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND id = eai_runtime.current_workspace_id()
  );

-- Defense in depth for every workspace-owned table: matching a workspace UUID
-- alone is not sufficient. The selected workspace must also be visible inside
-- the selected tenant under the workspaces RLS policy above.
CREATE OR REPLACE FUNCTION eai_runtime.workspace_in_current_scope(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = target_workspace_id
      AND w.id = eai_runtime.current_workspace_id()
      AND w.tenant_id = eai_runtime.current_tenant_id()
  );
$$;

ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_memberships_scope ON workspace_memberships;
CREATE POLICY eai_workspace_memberships_scope ON workspace_memberships
  USING (eai_runtime.workspace_in_current_scope(workspace_id))
  WITH CHECK (eai_runtime.workspace_in_current_scope(workspace_id));

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_roles_scope ON roles;
CREATE POLICY eai_roles_scope ON roles
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND (
      workspace_id IS NULL
      OR eai_runtime.workspace_in_current_scope(workspace_id)
    )
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND (
      workspace_id IS NULL
      OR eai_runtime.workspace_in_current_scope(workspace_id)
    )
  );

ALTER TABLE permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_grants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_permission_grants_scope ON permission_grants;
CREATE POLICY eai_permission_grants_scope ON permission_grants
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id IS NOT NULL
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id IS NOT NULL
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  );

ALTER TABLE service_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_principals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_service_principals_scope ON service_principals;
CREATE POLICY eai_service_principals_scope ON service_principals
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND (
      workspace_id IS NULL
      OR eai_runtime.workspace_in_current_scope(workspace_id)
    )
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND (
      workspace_id IS NULL
      OR eai_runtime.workspace_in_current_scope(workspace_id)
    )
  );

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_audit_events_scope ON audit_events;
CREATE POLICY eai_audit_events_scope ON audit_events
  USING (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id IS NOT NULL
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  )
  WITH CHECK (
    tenant_id = eai_runtime.current_tenant_id()
    AND workspace_id IS NOT NULL
    AND eai_runtime.workspace_in_current_scope(workspace_id)
  );

ALTER TABLE workspace_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_sources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_sources_scope ON workspace_sources;
CREATE POLICY eai_workspace_sources_scope ON workspace_sources
  USING (eai_runtime.workspace_in_current_scope(workspace_id))
  WITH CHECK (eai_runtime.workspace_in_current_scope(workspace_id));

ALTER TABLE workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_documents_scope ON workspace_documents;
CREATE POLICY eai_workspace_documents_scope ON workspace_documents
  USING (eai_runtime.workspace_in_current_scope(workspace_id))
  WITH CHECK (eai_runtime.workspace_in_current_scope(workspace_id));

ALTER TABLE workspace_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_jobs_scope ON workspace_jobs;
CREATE POLICY eai_workspace_jobs_scope ON workspace_jobs
  USING (eai_runtime.workspace_in_current_scope(workspace_id))
  WITH CHECK (eai_runtime.workspace_in_current_scope(workspace_id));

ALTER TABLE workspace_connector_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_connector_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_connector_links_scope ON workspace_connector_links;
CREATE POLICY eai_workspace_connector_links_scope ON workspace_connector_links
  USING (eai_runtime.workspace_in_current_scope(workspace_id))
  WITH CHECK (eai_runtime.workspace_in_current_scope(workspace_id));

-- Child tables inherit scope by requiring their parent to be visible in the
-- current RLS-filtered transaction. These policies intentionally do not infer
-- or select replacement tenant/workspace context.
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_role_permissions_scope ON role_permissions;
CREATE POLICY eai_role_permissions_scope ON role_permissions
  USING (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id))
  WITH CHECK (EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id));

ALTER TABLE service_principal_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_principal_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_service_principal_permissions_scope ON service_principal_permissions;
CREATE POLICY eai_service_principal_permissions_scope ON service_principal_permissions
  USING (
    EXISTS (
      SELECT 1 FROM service_principals sp
      WHERE sp.id = service_principal_permissions.service_principal_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_principals sp
      WHERE sp.id = service_principal_permissions.service_principal_id
    )
  );

ALTER TABLE workspace_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_job_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eai_workspace_job_events_scope ON workspace_job_events;
CREATE POLICY eai_workspace_job_events_scope ON workspace_job_events
  USING (
    EXISTS (
      SELECT 1 FROM workspace_jobs j
      WHERE j.id = workspace_job_events.workspace_job_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_jobs j
      WHERE j.id = workspace_job_events.workspace_job_id
    )
  );
