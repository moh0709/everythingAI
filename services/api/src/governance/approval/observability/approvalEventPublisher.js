export function publishApprovalEvent({
  eventType,
  approvalId,
  correlationId = null,
  metadata = {},
  timestamp = new Date().toISOString()
} = {}) {
  return Object.freeze({
    eventType,
    approvalId,
    correlationId,
    metadata: Object.freeze({ ...metadata }),
    governanceVersion: '5.5',
    governanceDomain: 'approval',
    taxonomyCategory: 'governance.approval.advisory',
    advisoryOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false,
    timestamp
  });
}
