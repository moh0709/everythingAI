import crypto from 'node:crypto';

export function buildCorrelationId() {
  return crypto.randomUUID();
}

export function freezeCorrelationChain(chain = {}) {
  return Object.freeze({
    ...chain,
    frozenAt: new Date().toISOString()
  });
}

export function linkCorrelationChains(chains = []) {
  return freezeCorrelationChain({
    correlationChainId: buildCorrelationId(),
    chains,
    linkedAt: new Date().toISOString()
  });
}

export function validateCorrelationConsistency(chain = {}) {
  const valid = Boolean(chain.correlationChainId);

  return Object.freeze({
    valid,
    severity: valid ? 'IV-0' : 'IV-4',
    validatedAt: new Date().toISOString()
  });
}
