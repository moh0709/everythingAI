export function createOperatorModel({
  operatorId,
  displayName,
  status = 'active',
  governanceVersion = '5.1',
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString()
}) {
  return Object.freeze({
    operatorId,
    displayName,
    status,
    governanceVersion,
    createdAt,
    updatedAt
  });
}
