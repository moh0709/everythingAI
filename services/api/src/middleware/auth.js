const DEFAULT_API_TOKEN = 'replace-with-your-local-development-token';

export function requireApiToken(req, res, next) {
  const apiToken = process.env.API_TOKEN || DEFAULT_API_TOKEN;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== apiToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid bearer token.',
    });
  }

  next();
}
