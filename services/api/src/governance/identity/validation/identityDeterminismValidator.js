export function validateIdentityDeterminism({
  input,
  firstResult,
  secondResult
}) {
  const deterministic = JSON.stringify(firstResult) === JSON.stringify(secondResult);

  return Object.freeze({
    valid: deterministic,
    severity: deterministic ? 'IV-0' : 'IV-4',
    evaluatedInput: input,
    evaluatedAt: new Date().toISOString()
  });
}
