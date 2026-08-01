export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}
