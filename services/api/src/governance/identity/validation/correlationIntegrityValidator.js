function validateCorrelationIntegrity(chains = []) {
  const ids = chains.map((chain) => chain.correlationId).filter(Boolean);
  const uniqueIds = new Set(ids);

  const valid = ids.length === uniqueIds.size;

  return Object.freeze({
    valid,
    totalChains: chains.length,
    uniqueCorrelationIds: uniqueIds.size,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

module.exports = {
  validateCorrelationIntegrity
};
