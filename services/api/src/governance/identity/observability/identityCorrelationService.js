const crypto = require('crypto');

function buildCorrelationId() {
  return crypto.randomUUID();
}

function freezeCorrelationChain(chain = {}) {
  return Object.freeze({
    ...chain,
    frozenAt: new Date().toISOString()
  });
}

function linkCorrelationChains(chains = []) {
  return freezeCorrelationChain({
    correlationChainId: buildCorrelationId(),
    chains,
    linkedAt: new Date().toISOString()
  });
}

function validateCorrelationConsistency(chain = {}) {
  const valid = Boolean(chain.correlationChainId);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}

module.exports = {
  buildCorrelationId,
  freezeCorrelationChain,
  linkCorrelationChains,
  validateCorrelationConsistency
};
