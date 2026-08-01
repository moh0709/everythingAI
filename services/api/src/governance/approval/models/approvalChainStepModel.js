const allowedApprovalStates = new Set(['requested', 'reviewed', 'approved', 'rejected', 'deferred']);

export function createApprovalChainStepModel({
  stepId,
  approverRole,
  state = 'requested',
  order = 0,
  rationale,
  reviewedAt = null
} = {}) {
  if (!stepId) {
    throw new Error('approval chain step requires stepId');
  }
  if (!allowedApprovalStates.has(state)) {
    throw new Error(`unknown approval step state: ${state}`);
  }

  return Object.freeze({
    stepId,
    approverRole: approverRole || 'governance_reviewer',
    state,
    order: Number.isFinite(order) ? order : 0,
    rationale: rationale || 'Approval chain step recorded for explainable advisory governance.',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    reviewedAt
  });
}
