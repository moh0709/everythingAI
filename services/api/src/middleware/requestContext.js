function normalizeHeaderValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeActorType(value) {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) {
    return 'anonymous';
  }

  return ['user', 'service_principal', 'system', 'anonymous'].includes(normalized)
    ? normalized
    : 'anonymous';
}

export function deriveRequestContext(req = {}) {
  const headers = req.headers ?? {};

  return {
    actor: {
      type: normalizeActorType(headers['x-actor-type']),
      id: normalizeHeaderValue(headers['x-actor-id']),
      email: normalizeHeaderValue(headers['x-actor-email']),
    },
    tenant: {
      id: normalizeHeaderValue(headers['x-tenant-id']),
      slug: normalizeHeaderValue(headers['x-tenant-slug']),
    },
    workspace: {
      id: normalizeHeaderValue(headers['x-workspace-id']),
      slug: normalizeHeaderValue(headers['x-workspace-slug']),
    },
    request: {
      id: normalizeHeaderValue(headers['x-request-id']),
      source: normalizeHeaderValue(headers['x-request-source']) ?? 'api',
    },
  };
}

export function attachRequestContext(req, _res, next) {
  req.requestContext = deriveRequestContext(req);
  next();
}

export const requestContextHeaders = {
  actorType: 'x-actor-type',
  actorId: 'x-actor-id',
  actorEmail: 'x-actor-email',
  tenantId: 'x-tenant-id',
  tenantSlug: 'x-tenant-slug',
  workspaceId: 'x-workspace-id',
  workspaceSlug: 'x-workspace-slug',
  requestId: 'x-request-id',
  requestSource: 'x-request-source',
};
