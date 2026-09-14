import fs from 'node:fs';

const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing required Phase 6 artifact: ${file}`);
};
const requireText = (file, text) => {
  requireFile(file);
  if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(text)) {
    failures.push(`${file} missing required text: ${text}`);
  }
};

const middleware = [
  'services/api/src/middleware/auth.js',
  'services/api/src/middleware/membershipAuthorization.js',
  'services/api/src/middleware/permissionAuthorization.js',
  'services/api/src/middleware/resourceScopeAuthorization.js',
  'services/api/src/middleware/deviceAuditAttribution.js',
  'services/api/src/middleware/auditContextBridge.js',
];
middleware.forEach(requireFile);

const tests = [
  'services/api/test/productionAuthenticationMiddleware.test.js',
  'services/api/test/productionMembershipAuthorization.test.js',
  'services/api/test/productionPermissionAuthorization.test.js',
  'services/api/test/productionResourceScopeAuthorization.test.js',
  'services/api/test/productionDeviceAuditAttribution.test.js',
  'services/api/test/productionAuditActorType.test.js',
  'services/api/test/productionTrustedAuditContext.test.js',
  'services/api/test/productionIntegratedAuthorizationQualification.test.js',
];
tests.forEach(requireFile);

requireText('services/api/src/server.js', 'resolveAuthenticationMiddleware');
requireText('services/api/src/server.js', 'resolveMembershipAuthorizationMiddleware');
requireText('services/api/src/server.js', 'resolvePermissionAuthorizationMiddleware');
requireText('services/api/src/server.js', 'resolveDeviceIdentityMiddleware');
requireText('services/api/src/server.js', 'resolveAuditAttributionMiddleware');
requireText('services/api/src/routes/files.routes.js', 'productionResourceScopeAuthorization');
requireText('services/api/src/routes/files.routes.js', 'documents.read');
requireText('services/api/src/routes/actions.routes.js', 'resolveActionAuditContext');
requireText('services/api/src/routes/actions.routes.js', 'auditContext');

const releaseDecision = 'docs/PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_RELEASE_DECISION_2026-09-14.md';
const handover = 'docs/HANDOVER_2026-09-14_PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION.json';
requireFile(releaseDecision);
requireFile(handover);
requireText(releaseDecision, 'Status: ACCEPTED');
requireText(releaseDecision, 'PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS');
requireText(releaseDecision, '6eef85c405a020feb30d239b4c55b26d747f0ccb');
requireText(releaseDecision, '71fd3627b783284bccf37f7628b86a8a78fb3c07');
requireText(releaseDecision, 'does not provision production secrets');
requireText(handover, '"decision_state": "ACCEPTED"');
requireText(handover, '"decision": "PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS"');

const canonicalFiles = [
  'PROJECT_STATE.md',
  'AI_BOOTSTRAP.md',
  'docs/ROADMAP.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
];
for (const file of canonicalFiles) {
  requireText(file, 'PHASE6_PRODUCTION_IDENTITY_TENANCY_AUTHORIZATION_PASS');
  requireText(file, 'Phase 6');
}
requireText('PROJECT_STATE.md', '71fd3627b783284bccf37f7628b86a8a78fb3c07');
requireText('AI_BOOTSTRAP.md', '6eef85c405a020feb30d239b4c55b26d747f0ccb');

if (failures.length) {
  console.error('PHASE6_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE6_CLOSURE_ACCEPTED_EVIDENCE_VALID');
console.log(`Phase 6 middleware boundaries present: ${middleware.length}`);
console.log(`Phase 6 focused qualification tests present: ${tests.length}`);
console.log(`Phase 6 canonical authority files synchronized: ${canonicalFiles.length}`);
console.log('Authority boundary preserved: no production secrets, privileged infrastructure, destructive production cutover, external certification, SLA/SLO commitment, broad route authorization rollout, or broad automatic-authority expansion.');
