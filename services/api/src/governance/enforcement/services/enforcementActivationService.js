import enforcementActivationContract from '../contracts/enforcementActivationContract.js';

const phaseLevels = Object.freeze({
  shadow: 'L0',
  soft_enforcement: 'L1',
  controlled_blocking: 'L2',
});

function shadowMaturityComplete(shadowMaturity = {}) {
  return shadowMaturity.minimumObservationsMet === true
    && shadowMaturity.deterministicReplayMet === true
    && shadowMaturity.driftFreeWindowMet === true
    && shadowMaturity.explainabilityCoverageMet === true;
}

function rollbackVerified(rollback = {}) {
  return Boolean(rollback.rollbackPlanId && rollback.verified === true);
}

function runtimeCompatible(runtimeCompatibility = {}) {
  return runtimeCompatibility.runtimeSafeguardsAuthoritative === true
    && runtimeCompatibility.noLifecycleMutation === true
    && runtimeCompatibility.boundedBlocking === true;
}

function certificationReady(certification = {}) {
  return certification.certified === true
    && Array.isArray(certification.evidenceIds)
    && certification.evidenceIds.length > 0;
}

function hasExplanation(authorizationDecision = {}) {
  return Array.isArray(authorizationDecision.explanations)
    && authorizationDecision.explanations.some((entry) => String(entry.rationale || '').trim().length > 0);
}

export function buildEnforcementActivationPlan({
  planId,
  authorizationDecisionId,
  correlationId = null,
  requestedPhase = 'shadow',
  shadowMaturity = {},
  rollback = {},
  runtimeCompatibility = {},
  certification = {},
  plannedAt = new Date().toISOString(),
} = {}) {
  if (!planId) {
    throw new Error('enforcement activation plan requires planId');
  }

  return Object.freeze({
    planId,
    authorizationDecisionId: authorizationDecisionId || null,
    correlationId,
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    requestedPhase,
    phaseSequence: enforcementActivationContract.phaseSequence,
    enforcementLevel: phaseLevels[requestedPhase] || 'L0',
    phasedActivationOnly: true,
    shadowMaturity: Object.freeze({ ...shadowMaturity }),
    rollback: Object.freeze({ ...rollback }),
    runtimeCompatibility: Object.freeze({ ...runtimeCompatibility }),
    certification: Object.freeze({ ...certification }),
    runtimeSafeguardSupremacy: true,
    runtimeSafeguardsAuthoritative: true,
    hiddenEscalation: false,
    hiddenEnforcementEscalation: false,
    lifecycleMutation: false,
    plannedAt,
  });
}

export function evaluateSoftEnforcementActivation({ plan } = {}) {
  if (!plan) {
    throw new Error('soft enforcement activation requires plan');
  }

  const ready = shadowMaturityComplete(plan.shadowMaturity) && rollbackVerified(plan.rollback);

  return Object.freeze({
    activationId: `enforcement-soft-${plan.planId}`,
    planId: plan.planId,
    correlationId: plan.correlationId || null,
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    phase: 'soft_enforcement',
    enforcementLevel: 'L1',
    softEnforcementActive: ready,
    observable: true,
    recoverable: rollbackVerified(plan.rollback),
    explainableBlocking: true,
    runtimeBlocking: false,
    lifecycleMutation: false,
    runtimeSafeguardSupremacy: true,
    hiddenEscalation: false,
    evaluatedAt: new Date().toISOString(),
  });
}

export function evaluateControlledAuthorizationBlocking({
  plan,
  authorizationDecision = {},
} = {}) {
  if (!plan) {
    throw new Error('controlled authorization blocking requires plan');
  }

  const reasonCodes = [];
  if (!shadowMaturityComplete(plan.shadowMaturity)) reasonCodes.push('SHADOW_MATURITY_REQUIRED');
  if (!rollbackVerified(plan.rollback)) reasonCodes.push('ROLLBACK_REQUIRED');
  if (!runtimeCompatible(plan.runtimeCompatibility)) reasonCodes.push('RUNTIME_COMPATIBILITY_REQUIRED');
  if (!certificationReady(plan.certification)) reasonCodes.push('OPERATIONAL_CERTIFICATION_REQUIRED');
  if (!hasExplanation(authorizationDecision)) reasonCodes.push('EXPLAINABLE_BLOCKING_REQUIRED');

  const blockingAllowed = reasonCodes.length === 0;

  return Object.freeze({
    blockingDecisionId: `enforcement-block-${plan.planId}`,
    planId: plan.planId,
    authorizationDecisionId: authorizationDecision.decisionId || plan.authorizationDecisionId || null,
    correlationId: plan.correlationId || null,
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    phase: 'controlled_blocking',
    enforcementLevel: blockingAllowed ? 'L2' : 'L1',
    blockingAllowed,
    failClosed: !blockingAllowed,
    blockingReasonCodes: Object.freeze(reasonCodes),
    explainableBlocking: hasExplanation(authorizationDecision),
    observable: true,
    recoverable: rollbackVerified(plan.rollback),
    runtimeBlocking: blockingAllowed,
    boundedBlocking: blockingAllowed,
    lifecycleMutation: false,
    runtimeSafeguardSupremacy: true,
    runtimeSafeguardsAuthoritative: true,
    hiddenEscalation: false,
    hiddenEnforcementEscalation: false,
    evaluatedAt: new Date().toISOString(),
  });
}

export function executeEnforcementRollback({
  rollbackPlanId,
  activationId,
  reason,
  runtimeDecision = null,
  executedAt = new Date().toISOString(),
} = {}) {
  if (!rollbackPlanId) {
    throw new Error('enforcement rollback requires rollbackPlanId');
  }

  return Object.freeze({
    rollbackId: `enforcement-rollback-${rollbackPlanId}`,
    rollbackPlanId,
    activationId: activationId || null,
    reason: reason || null,
    governanceDomain: 'enforcement',
    governanceVersion: '5.8',
    rollbackExecuted: true,
    restoredPhase: 'shadow',
    enforcementLevel: 'L0',
    runtimeDecision,
    runtimeSafeguardSupremacy: true,
    runtimeSafeguardsAuthoritative: true,
    runtimeBlocking: false,
    lifecycleMutation: false,
    hiddenEscalation: false,
    executedAt,
  });
}
