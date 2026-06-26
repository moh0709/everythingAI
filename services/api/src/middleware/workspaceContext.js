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

export function deriveWorkspaceContext(req = {}) {
  const requestContext = req.requestContext ?? deriveRequestContext(req);
  const tenant = toScopePart(requestContext.tenant);
  const workspace = toScopePart(requestContext.workspace);
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

export function attachWorkspaceContext(req, _res, next) {
  req.workspaceContext = deriveWorkspaceContext(req);
  next();
}
