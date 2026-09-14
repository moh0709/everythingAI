function normalizeValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUniqueValues(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(normalizeValue).filter(Boolean))].sort();
}

function sendForbidden(res) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'The authenticated principal is not authorized for this operation.',
  });
}

function sendUnavailable(res) {
  return res.status(503).json({
    error: 'AuthorizationUnavailable',
    message: 'Production permission authorization could not be completed.',
  });
}

function createPassthroughPermissionAuthorizationMiddleware() {
  return (_req, _res, next) => next();
}

export function hasProductionPermission(authorizationContext, permissionKey) {
  const normalizedPermission = normalizeValue(permissionKey);
  if (!normalizedPermission || authorizationContext?.permissionStatus !== 'resolved') {
    return false;
  }

  return Array.isArray(authorizationContext.permissions)
    && authorizationContext.permissions.includes(normalizedPermission);
}

export function createProductionPermissionRequirementMiddleware(requiredPermissions = []) {
  const normalizedRequiredPermissions = normalizeUniqueValues(requiredPermissions);

  return (req, res, next) => {
    if (
      normalizedRequiredPermissions.length === 0
      || normalizedRequiredPermissions.every((permission) => (
        hasProductionPermission(req.authorizationContext, permission)
      ))
    ) {
      return next();
    }

    return sendForbidden(res);
  };
}

export function createProductionPermissionAuthorizationMiddleware({ resolvePermissions } = {}) {
  return async (req, res, next) => {
    const authorizationContext = req.authorizationContext;
    const principalId = normalizeValue(authorizationContext?.principalId);
    const principalType = normalizeValue(authorizationContext?.principalType);
    const tenantId = normalizeValue(authorizationContext?.tenantId);
    const workspaceId = normalizeValue(authorizationContext?.workspaceId);

    if (
      authorizationContext?.status !== 'authorized'
      || !principalId
      || !principalType
      || !tenantId
      || !workspaceId
    ) {
      return sendForbidden(res);
    }

    if (typeof resolvePermissions !== 'function') {
      return sendUnavailable(res);
    }

    try {
      const outcome = await resolvePermissions({
        principal: { id: principalId, type: principalType },
        tenant: { id: tenantId },
        workspace: { id: workspaceId },
        membership: authorizationContext.membership ?? null,
      }, {
        requestContext: req.requestContext ?? null,
        workspaceContext: req.workspaceContext ?? null,
      });

      const resolved = outcome?.status === 'resolved' || outcome?.allowed === true;
      if (!resolved) {
        return sendForbidden(res);
      }

      const roles = normalizeUniqueValues(outcome?.roles);
      const permissions = normalizeUniqueValues(outcome?.permissions);

      if (outcome?.ambiguous === true || outcome?.denied === true) {
        return sendForbidden(res);
      }

      req.authorizationContext = Object.freeze({
        ...authorizationContext,
        permissionStatus: 'resolved',
        roles: Object.freeze(roles),
        permissions: Object.freeze(permissions),
      });

      return next();
    } catch (_error) {
      return sendUnavailable(res);
    }
  };
}

export function resolvePermissionAuthorizationMiddleware(options = {}, dependencies = {}) {
  if (options.productionPermissionAuthorization !== true) {
    return dependencies.passthroughPermissionAuthorizationMiddleware
      ?? createPassthroughPermissionAuthorizationMiddleware();
  }

  const createProductionPermissionAuthorizationMiddlewareImpl =
    dependencies.createProductionPermissionAuthorizationMiddleware
    ?? createProductionPermissionAuthorizationMiddleware;

  return createProductionPermissionAuthorizationMiddlewareImpl({
    resolvePermissions: dependencies.resolvePermissions ?? options.resolvePermissions,
  });
}
