function createRoleModel({
  roleId,
  roleName,
  roleDescription = null,
  roleScope = 'governance',
  governanceVersion = '5.1',
  createdAt = new Date().toISOString()
}) {
  return Object.freeze({
    roleId,
    roleName,
    roleDescription,
    roleScope,
    governanceVersion,
    createdAt
  });
}

module.exports = {
  createRoleModel
};
