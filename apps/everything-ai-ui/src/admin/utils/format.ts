export { formatSize } from '../../shared/formatSize';

export function averageConfidence(items: Array<{ confidence?: number | string }>) {
  const values = items
    .map((item) => Number(item.confidence))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) return 'No plan yet';

  return `${Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100)}%`;
}
