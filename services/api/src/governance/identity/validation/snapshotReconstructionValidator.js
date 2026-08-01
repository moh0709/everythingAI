export function validateSnapshotReconstruction(snapshotBuilder, input) {
  const firstSnapshot = snapshotBuilder(input);
  const secondSnapshot = snapshotBuilder(input);

  const deterministic = JSON.stringify(firstSnapshot) === JSON.stringify(secondSnapshot);

  return Object.freeze({
    valid: deterministic,
    severity: deterministic ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
