export function validateApprovalLifecycle(evaluation = {}) {
  const valid = evaluation.governanceDomain === 'approval'
    && evaluation.mode === 'advisory'
    && evaluation.enforced === false
    && evaluation.runtimeBlocking === false
    && evaluation.lifecycleMutation === false
    && Array.isArray(evaluation.chainStepIds)
    && Array.isArray(evaluation.explanations);

  return Object.freeze({
    valid,
    severity: valid ? 'AV-0' : 'AV-4'
  });
}
