export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  const status = error.status || 500;

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : error.name || 'Request Error',
    message: error.message,
  });
}
