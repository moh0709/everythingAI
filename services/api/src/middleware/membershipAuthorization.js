function normalizeId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sendForbidden(res) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'The authenticated principal is not authorized for this workspace.',
  });
}

function createPassthroughMembershipAuthorizationMiddleware() {
  return (_req, _res, next) => next();
}

export function createProductionMembershipAuthorizationMiddleware({ resolveMembership } = {}) {
  return async (req, res, next) => {
    const principalId = normalizeId(req.authenticatedPrincipal?.id);
    const principalType = normalizeId(req.authenticatedPrincipal?.type);

    if (!principalId || !principalType || req.authenticatedPrincipal?.authenticated !== true) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'An authenticated principal is required.',
      });
    }

    const workspaceContext = req.workspaceContext;
    const tenantId = normalizeId(
      workspaceContext?.resolvedTenant?.id
      ?? workspaceContext?.tenant?.id,
    );
    const workspaceId = normalizeId(
      workspaceContext?.resolvedWorkspace?.id
      ?? workspaceContext?.workspace?.id,
    );

    if (workspaceContext?.resolution?.status !== 'resolved' || !tenantId || !workspaceId) {
      return sendForbidden(res);
    }

    if (typeof resolveMembership !== 'function') {
      return res.status(503).json({
        error: 'AuthorizationUnavailable',
        message: 'Production membership authorization is not configured.',
      });
    }

    try {
      const outcome = await resolveMembership({
        principal: {
          id: principalId,
          type: principalType,
        },
        tenant: { id: tenantId },
        workspace: { id: workspaceId },
      }, {
        requestContext: req.requestContext ?? null,
        workspaceContext,
      });

      const allowed = outcome?.allowed === true || outcome?.status === 'allowed';
      if (!allowed) {
        return sendForbidden(res);
      }

      req.authorizationContext = Object.freeze({
        status: 'authorized',
        principalId,
        principalType,
        tenantId,
        workspaceId,
        membership: outcome?.membership ?? null,
      });

      return next();
    } catch (_error) {
      return res.status(503).json({
        error: 'AuthorizationUnavailable',
        message: 'Production membership authorization could not be completed.',
      });
    }
  };
}

export function resolveMembershipAuthorizationMiddleware(options = {}, dependencies = {}) {
  if (options.productionMembershipAuthorization !== true) {
    return dependencies.passthroughMembershipAuthorizationMiddleware
      ?? createPassthroughMembershipAuthorizationMiddleware();
  }

  const createProductionMembershipAuthorizationMiddlewareImpl =
    dependencies.createProductionMembershipAuthorizationMiddleware
    ?? createProductionMembershipAuthorizationMiddleware;

  return createProductionMembershipAuthorizationMiddlewareImpl({
    resolveMembership: dependencies.resolveMembership ?? options.resolveMembership,
  });
}
