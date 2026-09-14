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
    message: 'The authenticated principal is not authorized for this device scope.',
  });
}

function sendUnavailable(res) {
  return res.status(503).json({
    error: 'AuthorizationUnavailable',
    message: 'Production device identity could not be completed.',
  });
}

function createPassthroughMiddleware() {
  return (_req, _res, next) => next();
}

function requestDeviceId(req = {}) {
  return normalizeValue(req.headers?.['x-device-id']);
}

export function createProductionDeviceIdentityMiddleware({ resolveDeviceIdentity } = {}) {
  return async (req, res, next) => {
    const deviceId = requestDeviceId(req);

    // Device identity is optional for browser/user requests. When a device is
    // asserted, however, it must be resolved and exactly scope-bound.
    if (!deviceId) {
      req.deviceIdentityContext = Object.freeze({ status: 'not-present', deviceId: null });
      return next();
    }

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

    if (typeof resolveDeviceIdentity !== 'function') {
      return sendUnavailable(res);
    }

    try {
      const outcome = await resolveDeviceIdentity({
        deviceId,
        principal: { id: principalId, type: principalType },
        tenant: { id: tenantId },
        workspace: { id: workspaceId },
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

      const device = outcome?.device;
      const resolvedDeviceId = normalizeValue(device?.id ?? device?.deviceId ?? device?.device_id);
      const deviceTenantId = normalizeValue(device?.tenantId ?? device?.tenant_id);
      const deviceWorkspaceId = normalizeValue(device?.workspaceId ?? device?.workspace_id);

      if (
        !resolvedDeviceId
        || resolvedDeviceId !== deviceId
        || deviceTenantId !== tenantId
        || deviceWorkspaceId !== workspaceId
      ) {
        return sendForbidden(res);
      }

      req.deviceIdentityContext = Object.freeze({
        status: 'resolved',
        deviceId: resolvedDeviceId,
        tenantId,
        workspaceId,
        deviceType: normalizeValue(device?.type ?? device?.deviceType ?? device?.device_type),
      });

      return next();
    } catch (_error) {
      return sendUnavailable(res);
    }
  };
}

export function createProductionAuditAttributionMiddleware() {
  return (req, res, next) => {
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

    const requestId = normalizeValue(
      req.requestContext?.request?.id
      ?? req.requestContext?.requestId,
    );
    const requestSource = normalizeValue(
      req.requestContext?.request?.source
      ?? req.requestContext?.requestSource,
    ) ?? 'api';
    const deviceId = req.deviceIdentityContext?.status === 'resolved'
      ? normalizeValue(req.deviceIdentityContext.deviceId)
      : null;

    req.auditAttribution = Object.freeze({
      actorType: principalType,
      actorId: principalId,
      tenantId,
      workspaceId,
      requestId,
      requestSource,
      deviceId,
    });

    return next();
  };
}

export function resolveDeviceIdentityMiddleware(options = {}, dependencies = {}) {
  if (options.productionDeviceIdentity !== true) {
    return dependencies.passthroughDeviceIdentityMiddleware ?? createPassthroughMiddleware();
  }

  const createMiddleware = dependencies.createProductionDeviceIdentityMiddleware
    ?? createProductionDeviceIdentityMiddleware;

  return createMiddleware({
    resolveDeviceIdentity: dependencies.resolveDeviceIdentity ?? options.resolveDeviceIdentity,
  });
}

export function resolveAuditAttributionMiddleware(options = {}, dependencies = {}) {
  if (options.productionAuditAttribution !== true) {
    return dependencies.passthroughAuditAttributionMiddleware ?? createPassthroughMiddleware();
  }

  const createMiddleware = dependencies.createProductionAuditAttributionMiddleware
    ?? createProductionAuditAttributionMiddleware;

  return createMiddleware();
}
