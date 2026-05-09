function buildIdentityContext({
  operatorId,
  resolvedRoles = [],
  governanceVersion = '5.1',
  traceContext = {},
  resolutionTimestamp = new Date().toISOString()
}) {
  return Object.freeze({
    operatorId,
    resolvedRoles: [...resolvedRoles],
    governanceVersion,
    traceContext,
    resolutionTimestamp,
    mode: 'observational'
  });
}

function resolveOperator(operator) {
  if (!operator || !operator.operatorId) {
    return null;
  }

  return Object.freeze({
    operatorId: operator.operatorId,
    displayName: operator.displayName || null,
    status: operator.status || 'active'
  });
}

function resolveOperatorRoles(assignments = []) {
  return Object.freeze(
    assignments
      .map((assignment) => assignment.roleName)
      .filter(Boolean)
      .sort()
  );
}

module.exports = {
  buildIdentityContext,
  resolveOperator,
  resolveOperatorRoles
};
