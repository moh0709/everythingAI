import { deriveRequestContext } from './requestContext.js';

function normalizeScopeValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasScopeValue(scopePart) {
  return Boolean(scopePart.id || scopePart.slug);
}

function toScopePart(scopePart = {}) {
  return {
    id: normalizeScopeValue(scopePart.id),
    slug: normalizeScopeValue(scopePart.slug),
  };
}

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function normalizeLookupResult(result) {
  if (result && typeof result === 'object' && typeof result.status === 'string') {
    return result;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return { status: 'missing', record: null };
    }

    if (result.length === 1) {
      return { status: 'found', record: result[0] };
    }

    return { status: 'ambiguous', records: result.slice() };
  }

  if (result == null) {
    return { status: 'missing', record: null };
  }

  return { status: 'found', record: result };
}

function createReadOnlyRequestContext(requestContext, tenant, workspace) {
  const hasTenant = hasScopeValue(tenant);
  const hasWorkspace = hasScopeValue(workspace);

  return {
    requestContext,
    tenant,
    workspace,
    readOnly: true,
    resolution: {
      mode: 'request-context',
      status: hasTenant || hasWorkspace ? 'scoped' : 'unresolved',
      tenant: hasTenant ? 'present' : 'missing',
      workspace: hasWorkspace ? 'present' : 'missing',
    },
  };
}

function createProductionResolutionContext(requestContext, tenant, workspace, identityRepository) {
  const baseContext = {
    requestContext,
    tenant,
    workspace,
    readOnly: true,
    productionResolutionEnabled: true,
    resolvedTenant: null,
    resolvedWorkspace: null,
  };

  if (!identityRepository) {
    return {
      ...baseContext,
      resolution: {
        mode: 'production-persistence',
        status: 'unresolved',
        tenant: 'missing',
        workspace: 'missing',
        reason: 'identity-repository-unavailable',
      },
    };
  }

  const tenantLookup = tenant.id
    ? normalizeLookupResult(identityRepository.findTenantByStableId?.(tenant.id))
    : tenant.slug
      ? normalizeLookupResult(identityRepository.findTenantBySlug?.(tenant.slug))
      : { status: 'missing', record: null };

  if (tenantLookup.status !== 'found') {
    return {
      ...baseContext,
      resolution: {
        mode: 'production-persistence',
        status: 'unresolved',
        tenant: tenantLookup.status,
        workspace: 'missing',
        reason: tenantLookup.status === 'ambiguous'
          ? 'tenant-lookup-ambiguous'
          : 'tenant-lookup-missing',
      },
    };
  }

  const resolvedTenant = tenantLookup.record?.record ?? tenantLookup.record;
  const resolvedTenantId = resolvedTenant?.id ?? tenantLookup.record?.id;
  const workspaceLookup = workspace.id
    ? normalizeLookupResult(identityRepository.findWorkspaceByStableId?.({ tenantId: resolvedTenantId, workspaceId: workspace.id }))
    : workspace.slug
      ? normalizeLookupResult(identityRepository.findWorkspaceBySlug?.({ tenantId: resolvedTenantId, workspaceSlug: workspace.slug }))
      : { status: 'missing', record: null };

  if (workspaceLookup.status !== 'found') {
    return {
      ...baseContext,
      resolvedTenant,
      resolution: {
        mode: 'production-persistence',
        status: 'unresolved',
        tenant: 'resolved',
        workspace: workspaceLookup.status,
        reason: workspaceLookup.status === 'ambiguous'
          ? 'workspace-lookup-ambiguous'
          : 'workspace-lookup-missing',
      },
    };
  }

  const resolvedWorkspace = workspaceLookup.record?.record ?? workspaceLookup.record;

  return {
    ...baseContext,
    resolvedTenant,
    resolvedWorkspace,
    resolution: {
      mode: 'production-persistence',
      status: 'resolved',
      tenant: 'resolved',
      workspace: 'resolved',
    },
  };
}

export function deriveWorkspaceContext(req = {}, options = {}) {
  const requestContext = req.requestContext ?? deriveRequestContext(req);
  const tenant = toScopePart(requestContext.tenant);
  const workspace = toScopePart(requestContext.workspace);

  if (!options.productionResolution) {
    return createReadOnlyRequestContext(requestContext, tenant, workspace);
  }

  return createProductionResolutionContext(
    requestContext,
    tenant,
    workspace,
    options.identityRepository,
  );
}

export function createWorkspaceContextMiddleware(options = {}) {
  return (req, _res, next) => {
    req.workspaceContext = deriveWorkspaceContext(req, options);
    next();
  };
}

export function attachWorkspaceContext(req, res, next) {
  return createWorkspaceContextMiddleware()(req, res, next);
}
