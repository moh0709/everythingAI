import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rlsMigrationPath = path.resolve(__dirname, '../src/db/production/002_enterprise_rls_foundation.sql');

test('workspace RLS scope is bound to both selected workspace and selected tenant', () => {
  const sql = fs.readFileSync(rlsMigrationPath, 'utf8');

  assert.match(sql, /FUNCTION eai_runtime\.workspace_in_current_scope\(target_workspace_id UUID\)/);
  assert.match(sql, /w\.id = eai_runtime\.current_workspace_id\(\)/);
  assert.match(sql, /w\.tenant_id = eai_runtime\.current_tenant_id\(\)/);
  assert.match(
    sql,
    /CREATE POLICY eai_workspace_documents_scope[\s\S]*?USING \(eai_runtime\.workspace_in_current_scope\(workspace_id\)\)[\s\S]*?WITH CHECK \(eai_runtime\.workspace_in_current_scope\(workspace_id\)\)/,
  );
  assert.match(
    sql,
    /CREATE POLICY eai_workspace_jobs_scope[\s\S]*?USING \(eai_runtime\.workspace_in_current_scope\(workspace_id\)\)[\s\S]*?WITH CHECK \(eai_runtime\.workspace_in_current_scope\(workspace_id\)\)/,
  );
});
