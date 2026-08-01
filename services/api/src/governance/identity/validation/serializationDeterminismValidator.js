export function stableSerialize(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function validateSerializationDeterminism(input) {
  const first = stableSerialize(input);
  const second = stableSerialize(input);

  return Object.freeze({
    valid: first === second,
    first,
    second,
    severity: first === second ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
