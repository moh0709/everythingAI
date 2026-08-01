export function createApprovalRequestModel({
  approvalId,
  subjectId,
  operationType,
  requestedBy,
  rationale,
  requestedAt = new Date().toISOString()
} = {}) {
  if (!approvalId) {
    throw new Error('approval request requires approvalId');
  }

  return Object.freeze({
    approvalId,
    subjectId: subjectId || null,
    operationType: operationType || null,
    requestedBy: requestedBy || null,
    rationale: rationale || 'Approval requested for advisory governance review.',
    approvalState: 'requested',
    mode: 'advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    requestedAt
  });
}
