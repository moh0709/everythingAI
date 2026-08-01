import crypto from 'node:crypto';

export function buildApprovalLifecycleInput({
  request = null,
  chainSteps = [],
  correlationId = null,
  evaluatedAt = new Date().toISOString()
} = {}) {
  return Object.freeze({
    request,
    chainSteps: Object.freeze([...chainSteps]),
    correlationId,
    evaluatedAt
  });
}

function sortApprovalSteps(chainSteps = []) {
  return [...chainSteps].sort((first, second) => {
    const orderDelta = (first.order || 0) - (second.order || 0);
    if (orderDelta !== 0) return orderDelta;
    return String(first.stepId || '').localeCompare(String(second.stepId || ''));
  });
}

function deriveApprovalState(chainSteps = []) {
  if (chainSteps.some((step) => step.state === 'rejected')) {
    return 'rejected';
  }
  if (chainSteps.length > 0 && chainSteps.every((step) => step.state === 'approved')) {
    return 'approved';
  }
  if (chainSteps.some((step) => step.state === 'deferred')) {
    return 'deferred';
  }
  return 'pending';
}

export function evaluateApprovalLifecycle({ input = {} } = {}) {
  const sortedSteps = sortApprovalSteps(input.chainSteps || []);
  const approvalState = deriveApprovalState(sortedSteps);

  return Object.freeze({
    evaluationId: crypto.randomUUID(),
    approvalId: input.request?.approvalId || null,
    subjectId: input.request?.subjectId || null,
    operationType: input.request?.operationType || null,
    correlationId: input.correlationId || null,
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    mode: 'advisory',
    enforcementLevel: 'L0',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    approvalState,
    chainStepIds: Object.freeze(sortedSteps.map((step) => step.stepId)),
    explanations: Object.freeze(sortedSteps.map((step) => Object.freeze({
      stepId: step.stepId,
      approverRole: step.approverRole,
      state: step.state,
      rationale: step.rationale
    }))),
    evaluatedAt: input.evaluatedAt || new Date().toISOString()
  });
}
