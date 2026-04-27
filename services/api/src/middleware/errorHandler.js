export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
  });
}
