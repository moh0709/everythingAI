function comparableApprovalResult(result = {}) {
  return JSON.stringify({
    approvalId: result.approvalId,
    subjectId: result.subjectId,
    operationType: result.operationType,
    correlationId: result.correlationId,
    approvalState: result.approvalState,
    chainStepIds: result.chainStepIds,
    explanations: result.explanations,
    mode: result.mode,
    enforced: result.enforced,
    runtimeBlocking: result.runtimeBlocking,
    lifecycleMutation: result.lifecycleMutation
  });
}

export function validateApprovalDeterminism({ firstResult = {}, secondResult = {} } = {}) {
  const valid = comparableApprovalResult(firstResult) === comparableApprovalResult(secondResult);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4'
  });
}
