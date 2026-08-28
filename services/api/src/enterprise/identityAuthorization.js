function normalizeString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIssuer(value) {
  const issuer = normalizeString(value);
  if (!issuer) {
    return null;
  }

  return issuer.replace(/\/+$/, '');
}

function normalizeEmail(value) {
  const email = normalizeString(value);
  return email ? email.toLowerCase() : null;
}

function stableRecordId(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return normalizeString(record.id ?? record.tenant_id ?? record.tenantId ?? record.workspace_id ?? record.workspaceId);
}

function workspaceTenantId(workspace) {
  if (!workspace || typeof workspace !== 'object') {
    return null;
  }

  return normalizeString(workspace.tenant_id ?? workspace.tenantId);
}

function denied(reason) {
  return {
    authorized: false,
    reason,
    tenantId: null,
    workspaceId: null,
    principal: null,
  };
}

/**
 * Build the production authorization scope from an already authenticated
 * principal and an already-resolved production workspace context.
 *
 * This boundary deliberately performs no network, database, token-validation,
 * or identity-provider work. Callers must authenticate/validate the principal
 * before entering this function. Missing or inconsistent scope fails closed.
 */
export function createEnterpriseAuthorizationContext({ principal, workspaceContext } = {}) {
  const principalId = normalizeString(principal?.id);
  if (principal?.authenticated !== true || !principalId || principal?.type === 'anonymous') {
    return denied('principal-not-authenticated');
  }

  const resolution = workspaceContext?.resolution;
  if (
    workspaceContext?.productionResolutionEnabled !== true
    || resolution?.mode !== 'production-persistence'
    || resolution?.status !== 'resolved'
  ) {
    return denied('workspace-scope-unresolved');
  }

  const tenantId = stableRecordId(workspaceContext?.resolvedTenant);
  const workspaceId = stableRecordId(workspaceContext?.resolvedWorkspace);
  if (!tenantId || !workspaceId) {
    return denied('workspace-scope-missing');
  }

  const resolvedWorkspaceTenantId = workspaceTenantId(workspaceContext.resolvedWorkspace);
  if (!resolvedWorkspaceTenantId || resolvedWorkspaceTenantId !== tenantId) {
    return denied('workspace-tenant-mismatch');
  }

  return {
    authorized: true,
    reason: null,
    tenantId,
    workspaceId,
    principal: {
      ...principal,
      id: principalId,
    },
  };
}

/**
 * Enforce exact tenant/workspace ownership without disclosing which part of a
 * foreign resource scope differed. This keeps authorization failures generic.
 */
export function assertEnterpriseResourceScope(authorization, resourceScope = {}) {
  const resourceTenantId = normalizeString(resourceScope.tenantId ?? resourceScope.tenant_id);
  const resourceWorkspaceId = normalizeString(resourceScope.workspaceId ?? resourceScope.workspace_id);

  if (
    authorization?.authorized !== true
    || !resourceTenantId
    || !resourceWorkspaceId
    || resourceTenantId !== authorization.tenantId
    || resourceWorkspaceId !== authorization.workspaceId
  ) {
    return { allowed: false, reason: 'resource-scope-denied' };
  }

  return { allowed: true, reason: null };
}

/**
 * Provider-neutral mapping for claims that have already passed OIDC token
 * verification. Verification, key discovery, nonce/state handling, and session
 * issuance belong to the future identity-provider integration boundary.
 */
export function mapOidcIdentityClaims({ issuer, subject, email, displayName } = {}) {
  const provider = normalizeIssuer(issuer);
  const normalizedSubject = normalizeString(subject);

  if (!provider || !normalizedSubject) {
    return {
      status: 'invalid',
      identity: null,
      reason: 'oidc-issuer-and-subject-required',
    };
  }

  return {
    status: 'mapped',
    identity: {
      protocol: 'oidc',
      provider,
      subject: normalizedSubject,
      email: normalizeEmail(email),
      displayName: normalizeString(displayName),
    },
  };
}
