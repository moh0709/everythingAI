function normalizeValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveActionAuditContext(req = {}, options = {}) {
  if (options.productionAuditAttribution !== true) {
    return req.requestContext ?? null;
  }

  const attribution = req.auditAttribution;
  const actorType = normalizeValue(attribution?.actorType);
  const actorId = normalizeValue(attribution?.actorId);
  const tenantId = normalizeValue(attribution?.tenantId);
  const workspaceId = normalizeValue(attribution?.workspaceId);

  if (!actorType || !actorId || !tenantId || !workspaceId) {
    throw new Error('Trusted production audit attribution is required.');
  }

  return Object.freeze({
    actor: Object.freeze({
      type: actorType,
      id: actorId,
      email: null,
    }),
    tenant: Object.freeze({ id: tenantId }),
    workspace: Object.freeze({ id: workspaceId }),
    request: Object.freeze({
      id: normalizeValue(attribution.requestId),
      source: normalizeValue(attribution.requestSource) ?? 'api',
    }),
    device: Object.freeze({
      id: normalizeValue(attribution.deviceId),
    }),
  });
}
