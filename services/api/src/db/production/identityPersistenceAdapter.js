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

function invokeDelegatedLookup(delegate, methodName, args, fallbackLookup) {
  const method = delegate && typeof delegate[methodName] === 'function' ? delegate[methodName] : null;
  const outcome = method ? method(...args) : fallbackLookup();
  return normalizeLookupOutcome(outcome);
}

export function createProductionIdentityPersistenceAdapter(options = {}) {
  const delegate = options.delegate ?? {};
  const tenantRecords = Array.isArray(options.tenantRecords) ? options.tenantRecords : [];
  const workspaceRecords = Array.isArray(options.workspaceRecords) ? options.workspaceRecords : [];

  return {
    adapterType: 'production-identity-persistence-adapter',
    explicitProductionOnly: true,
    findTenantByStableId(stableId) {
      const normalizedStableId = toStableId(stableId);
      if (!normalizedStableId) {
        return { status: 'missing', record: null };
      }

      return invokeDelegatedLookup(
        delegate,
        'findTenantByStableId',
        [normalizedStableId],
        () => selectUniqueRecord(tenantRecords, (tenant) => toStableId(tenant?.id) === normalizedStableId),
      );
    },
    findTenantBySlug(slug) {
      const normalizedSlug = toSlug(slug);
      if (!normalizedSlug) {
        return { status: 'missing', record: null };
      }

      return invokeDelegatedLookup(
        delegate,
        'findTenantBySlug',
        [normalizedSlug],
        () => selectUniqueRecord(tenantRecords, (tenant) => toSlug(tenant?.slug) === normalizedSlug),
      );
    },
    findWorkspaceByStableId({ tenantId, workspaceId } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceId = toStableId(workspaceId);
      if (!normalizedTenantId || !normalizedWorkspaceId) {
        return { status: 'missing', record: null };
      }

      return invokeDelegatedLookup(
        delegate,
        'findWorkspaceByStableId',
        [{ tenantId: normalizedTenantId, workspaceId: normalizedWorkspaceId }],
        () => selectUniqueRecord(
          workspaceRecords,
          (workspace) => toStableId(workspace?.tenantId ?? workspace?.tenant_id) === normalizedTenantId
            && toStableId(workspace?.id) === normalizedWorkspaceId,
        ),
      );
    },
    findWorkspaceBySlug({ tenantId, workspaceSlug } = {}) {
      const normalizedTenantId = toStableId(tenantId);
      const normalizedWorkspaceSlug = toSlug(workspaceSlug);
      if (!normalizedTenantId || !normalizedWorkspaceSlug) {
        return { status: 'missing', record: null };
      }

      return invokeDelegatedLookup(
        delegate,
        'findWorkspaceBySlug',
        [{ tenantId: normalizedTenantId, workspaceSlug: normalizedWorkspaceSlug }],
        () => selectUniqueRecord(
          workspaceRecords,
          (workspace) => toStableId(workspace?.tenantId ?? workspace?.tenant_id) === normalizedTenantId
            && toSlug(workspace?.slug) === normalizedWorkspaceSlug,
        ),
      );
    },
    normalizeTenantRecord,
    normalizeWorkspaceRecord,
  };
}
