export function formatSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function averageConfidence(items: Array<{ confidence?: number | string }>) {
  const values = items
    .map((item) => Number(item.confidence))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) return 'No plan yet';

  return `${Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100)}%`;
}
