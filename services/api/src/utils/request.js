export function requireBodyString(req, res, fieldName) {
  const value = req.body?.[fieldName];

  if (typeof value !== 'string' || !value.trim()) {
    res.status(400).json({ error: `${fieldName} is required` });
    return null;
  }

  return value.trim();
}

export function requireQueryString(req, res, fieldName) {
  const value = req.query?.[fieldName]?.toString();

  if (typeof value !== 'string' || !value.trim()) {
    res.status(400).json({ error: `${fieldName} is required` });
    return null;
  }

  return value.trim();
}

export function parseLimit(value, fallback) {
  const parsed = Number.parseInt(value || fallback.toString(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
