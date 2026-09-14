const DEFAULT_API_TOKEN = 'replace-with-your-local-development-token';

function extractBearerToken(req = {}) {
  const header = req.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function sendUnauthorized(res, message = 'Missing or invalid bearer token.') {
  return res.status(401).json({
    error: 'Unauthorized',
    message,
  });
}

function normalizePrincipal(principal) {
  if (!principal || typeof principal !== 'object') {
    return null;
  }

  const id = typeof principal.id === 'string' ? principal.id.trim() : '';
  const type = typeof principal.type === 'string' ? principal.type.trim() : 'user';

  if (!id || !type || type === 'anonymous') {
    return null;
  }

  return Object.freeze({
    ...principal,
    id,
    type,
    authenticated: true,
  });
}

export function requireApiToken(req, res, next) {
  const apiToken = process.env.API_TOKEN || DEFAULT_API_TOKEN;
  const token = extractBearerToken(req);

  if (!token || token !== apiToken) {
    return sendUnauthorized(res);
  }

  next();
}

/**
 * Production authentication boundary.
 *
 * Token verification is deliberately injected so this module remains provider-neutral.
 * A production deployment must explicitly enable this middleware and supply a verifier.
 * When enabled, it never falls back to the local development API token.
 */
export function createProductionAuthenticationMiddleware({ verifyBearerToken } = {}) {
  return async (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      return sendUnauthorized(res);
    }

    if (typeof verifyBearerToken !== 'function') {
      return res.status(503).json({
        error: 'AuthenticationUnavailable',
        message: 'Production authentication is not configured.',
      });
    }

    try {
      const verification = await verifyBearerToken(token, {
        requestContext: req.requestContext ?? null,
        workspaceContext: req.workspaceContext ?? null,
      });
      const principal = normalizePrincipal(verification?.principal ?? verification);

      if (verification?.status === 'invalid' || !principal) {
        return sendUnauthorized(res);
      }

      req.authenticatedPrincipal = principal;
      next();
    } catch (_error) {
      return res.status(503).json({
        error: 'AuthenticationUnavailable',
        message: 'Production authentication could not be completed.',
      });
    }
  };
}

export function resolveAuthenticationMiddleware(options = {}, dependencies = {}) {
  if (options.productionAuthentication !== true) {
    return requireApiToken;
  }

  const createProductionAuthenticationMiddlewareImpl =
    dependencies.createProductionAuthenticationMiddleware ?? createProductionAuthenticationMiddleware;

  return createProductionAuthenticationMiddlewareImpl({
    verifyBearerToken: dependencies.verifyBearerToken ?? options.verifyBearerToken,
  });
}
