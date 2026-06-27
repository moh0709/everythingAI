function normalizeString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStableId(value) {
  return normalizeString(value);
}

function toSlug(value) {
  return normalizeString(value);
}

function normalizeRows(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === 'object') {
    if (Array.isArray(result.rows)) {
      return result.rows;
    }

    if (Array.isArray(result.records)) {
      return result.records;
    }
  }

  return [];
}

function normalizeLookupOutcome(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 'missing', record: null };
  }

  if (rows.length === 1) {
    return { status: 'found', record: rows[0] };
  }

  return { status: 'ambiguous', records: rows.slice() };
}

function resolveQueryExecutor(options = {}) {
  if (typeof options.query === 'function') {
    return options.query;
  }

  if (options.client && typeof options.client.query === 'function') {
    return options.client.query.bind(options.client);
  }

  if (options.pool && typeof options.pool.query === 'function') {
    return options.pool.query.bind(options.pool);
  }

  return null;
}

function runSelectLookup(query, sql, params) {
  if (typeof query !== 'function') {
    return { status: 'missing', record: null };
  }

  const rows = normalizeRows(query(sql, params));
  return normalizeLookupOutcome(rows);
}

function buildTenantByStableIdQuery() {
  return 'SELECT id, slug FROM tenants WHERE id = $1 LIMIT 2';
}

function buildTenantBySlugQuery() {
  return 'SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 2';
}

function buildWorkspaceByStableIdQuery() {
  return 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND id = $2 LIMIT 2';
}

function buildWorkspaceBySlugQuery() {
  return 'SELECT id, tenant_id, slug FROM workspaces WHERE tenant_id = $1 AND slug = $2 LIMIT 2';
}

export function createProductionIdentityPostgresAdapter(options = {}) {
  const query = resolveQueryExecutor(options);

  return {
    adapterType: 'production-identity-postgres-adapter',
    explicitProductionOnly: true,
    query,
    findTenantByStableId(stableId) {
      const normalizedStableId = toStableId(stableId);
      if (!normalizedStableId) {
        return { status: 'missing', record: null };
      }

      return runSelectLookup(query, buildTenantByStableIdQuery(), [normalizedStableId]);
    },
    findTenantBySlug(slug) {
      const normalizedSlug = toSlug(slug);
      if (!normalizedSlug) {
        return { status: 'missing', record: null };
      }

      return runSelectLookup(query, buildTenantBySlugQuery(), [normalizedSlug]);
    },
    findWorkspaceByStableId({ tenantId, workspaceId } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceId = toStableId(workspaceId);
      if (!normalizedTenantId || !normalizedWorkspaceId) {
        return { status: 'missing', record: null };
      }

      return runSelectLookup(query, buildWorkspaceByStableIdQuery(), [normalizedTenantId, normalizedWorkspaceId]);
    },
    findWorkspaceBySlug({ tenantId, workspaceSlug } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceSlug = toSlug(workspaceSlug);
      if (!normalizedTenantId || !normalizedWorkspaceSlug) {
        return { status: 'missing', record: null };
      }

      return runSelectLookup(query, buildWorkspaceBySlugQuery(), [normalizedTenantId, normalizedWorkspaceSlug]);
    },
  };
}
