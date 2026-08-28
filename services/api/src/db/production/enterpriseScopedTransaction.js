function normalizeScopeId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function assertQueryableClient(client) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('A PostgreSQL client with query(sql, params) is required.');
  }
}

/**
 * Runs one production persistence operation inside a transaction whose tenant
 * and workspace settings are local to that transaction. PostgreSQL RLS
 * policies consume these settings. Invalid or missing scope is rejected before
 * a query can execute.
 *
 * The helper does not create connections or choose a tenant/workspace. Callers
 * must pass the already-authorized exact scope.
 */
export async function withEnterpriseScopedTransaction(
  client,
  { tenantId, workspaceId } = {},
  operation,
) {
  assertQueryableClient(client);

  const normalizedTenantId = normalizeScopeId(tenantId);
  const normalizedWorkspaceId = normalizeScopeId(workspaceId);
  if (!normalizedTenantId || !normalizedWorkspaceId) {
    throw new Error('Enterprise tenant and workspace scope are required.');
  }

  if (typeof operation !== 'function') {
    throw new TypeError('A scoped transaction operation is required.');
  }

  await client.query('BEGIN');

  try {
    await client.query("SELECT set_config('eai.tenant_id', $1, true)", [normalizedTenantId]);
    await client.query("SELECT set_config('eai.workspace_id', $1, true)", [normalizedWorkspaceId]);

    const result = await operation(client, {
      tenantId: normalizedTenantId,
      workspaceId: normalizedWorkspaceId,
    });

    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original scoped-operation failure. Connection health is
      // the owning pool/client layer's responsibility.
    }
    throw error;
  }
}
