import { assertEnterpriseResourceScope } from '../enterprise/identityAuthorization.js';
import { hasProductionPermission } from './permissionAuthorization.js';

function normalizeValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sendForbidden(res) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'The authenticated principal is not authorized for this resource.',
  });
}

function sendUnavailable(res) {
  return res.status(503).json({
    error: 'AuthorizationUnavailable',
    message: 'Production resource authorization could not be completed.',
  });
}

function createPassthroughResourceScopeAuthorizationMiddleware() {
  return (_req, _res, next) => next();
}

export function createProductionResourceScopeAuthorizationMiddleware({
  requiredPermissions = [],
  resolveResourceScope,
  resourceIdFromRequest = (req) => req.params?.fileId ?? req.params?.resourceId ?? null,
} = {}) {
  const normalizedRequiredPermissions = [...new Set(
    (Array.isArray(requiredPermissions) ? requiredPermissions : [])
      .map(normalizeValue)
      .filter(Boolean),
  )].sort();

  return async (req, res, next) => {
    const authorizationContext = req.authorizationContext;

    if (
      authorizationContext?.status !== 'authorized'
      || authorizationContext?.permissionStatus !== 'resolved'
      || !normalizeValue(authorizationContext?.tenantId)
      || !normalizeValue(authorizationContext?.workspaceId)
    ) {
      return sendForbidden(res);
    }

    if (!normalizedRequiredPermissions.every((permission) => (
      hasProductionPermission(authorizationContext, permission)
    ))) {
      return sendForbidden(res);
    }

    const resourceId = normalizeValue(resourceIdFromRequest(req));
    if (!resourceId) {
      return sendForbidden(res);
    }

    if (typeof resolveResourceScope !== 'function') {
      return sendUnavailable(res);
    }

    try {
      const outcome = await resolveResourceScope({
        resourceId,
        principal: {
          id: authorizationContext.principalId,
          type: authorizationContext.principalType,
        },
        tenant: { id: authorizationContext.tenantId },
        workspace: { id: authorizationContext.workspaceId },
      }, {
        requestContext: req.requestContext ?? null,
        workspaceContext: req.workspaceContext ?? null,
      });

      if (
        outcome?.status !== 'resolved'
        || outcome?.ambiguous === true
        || outcome?.denied === true
      ) {
        return sendForbidden(res);
      }

      const resourceScope = outcome?.resourceScope ?? outcome?.scope ?? null;
      const scopeDecision = assertEnterpriseResourceScope(
        {
          authorized: true,
          tenantId: authorizationContext.tenantId,
          workspaceId: authorizationContext.workspaceId,
        },
        resourceScope,
      );

      if (scopeDecision.allowed !== true) {
        return sendForbidden(res);
      }

      req.resourceAuthorizationContext = Object.freeze({
        status: 'authorized',
        resourceId,
        tenantId: authorizationContext.tenantId,
        workspaceId: authorizationContext.workspaceId,
        requiredPermissions: Object.freeze([...normalizedRequiredPermissions]),
      });

      return next();
    } catch (_error) {
      return sendUnavailable(res);
    }
  };
}

export function resolveResourceScopeAuthorizationMiddleware(options = {}, dependencies = {}) {
  if (options.productionResourceScopeAuthorization !== true) {
    return dependencies.passthroughResourceScopeAuthorizationMiddleware
      ?? createPassthroughResourceScopeAuthorizationMiddleware();
  }

  const createMiddleware = dependencies.createProductionResourceScopeAuthorizationMiddleware
    ?? createProductionResourceScopeAuthorizationMiddleware;

  return createMiddleware({
    requiredPermissions: options.requiredPermissions ?? [],
    resolveResourceScope: dependencies.resolveResourceScope ?? options.resolveResourceScope,
    resourceIdFromRequest: options.resourceIdFromRequest,
  });
}
