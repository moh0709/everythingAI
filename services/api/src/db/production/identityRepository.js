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

function getRecordValue(record, keys) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (typeof normalized === 'string' && normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

function normalizeLookupOutcome(outcome) {
  if (outcome && typeof outcome === 'object' && !Array.isArray(outcome) && typeof outcome.status === 'string') {
    return outcome;
  }

  if (Array.isArray(outcome)) {
    if (outcome.length === 0) {
      return { status: 'missing', record: null };
    }

    if (outcome.length === 1) {
      return { status: 'found', record: outcome[0] };
    }

    return { status: 'ambiguous', records: outcome.slice() };
  }

  if (outcome == null) {
    return { status: 'missing', record: null };
  }

  return { status: 'found', record: outcome };
}

function selectUniqueRecord(records, predicate) {
  const matches = records.filter(predicate);

  if (matches.length === 0) {
    return { status: 'missing', record: null };
  }

  if (matches.length === 1) {
    return { status: 'found', record: matches[0] };
  }

  return { status: 'ambiguous', records: matches };
}

function normalizeTenantRecord(record) {
  return {
    id: getRecordValue(record, ['id', 'tenant_id', 'tenantId']),
    slug: getRecordValue(record, ['slug', 'tenant_slug', 'tenantSlug']),
    record,
  };
}

function normalizeWorkspaceRecord(record) {
  return {
    id: getRecordValue(record, ['id', 'workspace_id', 'workspaceId']),
    tenantId: getRecordValue(record, ['tenant_id', 'tenantId']),
    slug: getRecordValue(record, ['slug', 'workspace_slug', 'workspaceSlug']),
    record,
  };
}

function normalizeRepositoryResult(outcome, normalizer) {
  const normalized = normalizeLookupOutcome(outcome);

  if (normalized.status !== 'found') {
    return normalized;
  }

  return {
    status: 'found',
    record: normalizer(normalized.record),
  };
}

export function createProductionIdentityRepository(options = {}) {
  const adapter = options.adapter ?? {};
  const tenants = Array.isArray(options.tenants) ? options.tenants : [];
  const workspaces = Array.isArray(options.workspaces) ? options.workspaces : [];

  function invokeLookup(adapterMethodName, adapterArgs, fallbackLookup, normalizer) {
    const outcome = typeof adapter[adapterMethodName] === 'function'
      ? adapter[adapterMethodName](...adapterArgs)
      : fallbackLookup();

    return normalizeRepositoryResult(outcome, normalizer);
  }

  return {
    findTenantByStableId(stableId) {
      const normalizedStableId = toStableId(stableId);
      if (!normalizedStableId) {
        return { status: 'missing', record: null };
      }

      return invokeLookup(
        'findTenantByStableId',
        [normalizedStableId],
        () => selectUniqueRecord(tenants, (tenant) => toStableId(tenant?.id) === normalizedStableId),
        normalizeTenantRecord,
      );
    },
    findTenantBySlug(slug) {
      const normalizedSlug = toSlug(slug);
      if (!normalizedSlug) {
        return { status: 'missing', record: null };
      }

      return invokeLookup(
        'findTenantBySlug',
        [normalizedSlug],
        () => selectUniqueRecord(tenants, (tenant) => toSlug(tenant?.slug) === normalizedSlug),
        normalizeTenantRecord,
      );
    },
    findWorkspaceByStableId({ tenantId, workspaceId } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceId = toStableId(workspaceId);
      if (!normalizedTenantId || !normalizedWorkspaceId) {
        return { status: 'missing', record: null };
      }

      return invokeLookup(
        'findWorkspaceByStableId',
        [{ tenantId: normalizedTenantId, workspaceId: normalizedWorkspaceId }],
        () => selectUniqueRecord(
          workspaces,
          (workspace) => toStableId(workspace?.tenantId ?? workspace?.tenant_id) === normalizedTenantId
            && toStableId(workspace?.id) === normalizedWorkspaceId,
        ),
        normalizeWorkspaceRecord,
      );
    },
    findWorkspaceBySlug({ tenantId, workspaceSlug } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceSlug = toSlug(workspaceSlug);
      if (!normalizedTenantId || !normalizedWorkspaceSlug) {
        return { status: 'missing', record: null };
      }

      return invokeLookup(
        'findWorkspaceBySlug',
        [{ tenantId: normalizedTenantId, workspaceSlug: normalizedWorkspaceSlug }],
        () => selectUniqueRecord(
          workspaces,
          (workspace) => toStableId(workspace?.tenantId ?? workspace?.tenant_id) === normalizedTenantId
            && toSlug(workspace?.slug) === normalizedWorkspaceSlug,
        ),
        normalizeWorkspaceRecord,
      );
    },
  };
}
