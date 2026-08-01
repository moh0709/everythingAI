import crypto from 'node:crypto';

function sortApprovalSteps(chainSteps = []) {
  return [...chainSteps].sort((first, second) => {
    const orderDelta = (first.order || 0) - (second.order || 0);
    if (orderDelta !== 0) return orderDelta;
    return String(first.stepId || '').localeCompare(String(second.stepId || ''));
  });
}

export function buildExplainableApprovalChain({ request = null, chainSteps = [] } = {}) {
  const sortedSteps = sortApprovalSteps(chainSteps);

  return Object.freeze({
    chainId: crypto.randomUUID(),
    approvalId: request?.approvalId || null,
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    stepIds: Object.freeze(sortedSteps.map((step) => step.stepId)),
    explanations: Object.freeze(sortedSteps.map((step) => Object.freeze({
      stepId: step.stepId,
      approverRole: step.approverRole,
      state: step.state,
      rationale: step.rationale
    }))),
    generatedAt: new Date().toISOString()
  });
}
