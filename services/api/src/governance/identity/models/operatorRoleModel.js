function createOperatorRoleModel({
  assignmentId,
  operatorId,
  roleId,
  assignedBy = null,
  assignedAt = new Date().toISOString()
}) {
  return Object.freeze({
    assignmentId,
    operatorId,
    roleId,
    assignedBy,
    assignedAt
  });
}

module.exports = {
  createOperatorRoleModel
};
