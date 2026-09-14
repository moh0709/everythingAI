import fs from 'node:fs';

const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing required Phase 5 artifact: ${file}`);
};
const requireText = (file, text) => {
  requireFile(file);
  if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(text)) failures.push(`${file} missing required text: ${text}`);
};

const tests = [
  'services/api/test/phase5IdentityFoundation.test.js',
  'services/api/test/phase5PermissionFoundation.test.js',
  'services/api/test/phase5PolicyEngineFoundation.test.js',
  'services/api/test/phase5RiskClassificationFoundation.test.js',
  'services/api/test/phase5ApprovalWorkflowFoundation.test.js',
  'services/api/test/phase5EscalationGovernanceFoundation.test.js',
  'services/api/test/phase5AuthorizationDecisionLayer.test.js',
  'services/api/test/phase5ControlledEnforcementActivation.test.js',
];
tests.forEach(requireFile);

const reports = [
  'REPORTS/ISSUE-6-PHASE5-IDENTITY-FOUNDATION.md',
  'REPORTS/ISSUE-7-PHASE5-PERMISSION-FOUNDATION.md',
  'REPORTS/ISSUE-8-PHASE5-POLICY-ENGINE-SHADOW-GOVERNANCE.md',
  'REPORTS/ISSUE-9-PHASE5-RISK-CLASSIFICATION-FOUNDATION.md',
  'REPORTS/ISSUE-10-PHASE5-APPROVAL-WORKFLOW-FOUNDATION.md',
  'REPORTS/ISSUE-11-PHASE5-ESCALATION-GOVERNANCE-FOUNDATION.md',
  'REPORTS/ISSUE-12-PHASE5-AUTHORIZATION-DECISION-LAYER.md',
  'REPORTS/ISSUE-13-PHASE5-CONTROLLED-ENFORCEMENT-ACTIVATION.md',
];
reports.forEach(requireFile);

requireText('docs/ADR-005-013_GOVERNANCE_SESSION_HANDOVER_CONTINUITY.md', 'Status: Accepted');
requireText('docs/ADR-005-013_GOVERNANCE_SESSION_HANDOVER_CONTINUITY.md', 'does **not** itself activate runtime enforcement');
requireFile('scripts/validate-governance-continuity.mjs');
requireText('services/api/docs/phase5-implementation-status.md', 'Enforcement Level: L0');
requireText('services/api/docs/phase5-implementation-status.md', 'Mode: Advisory / Shadow Only');
requireText('services/api/docs/phase5-implementation-status.md', 'Runtime Mutation Status');
requireText('services/api/docs/phase5-implementation-status.md', 'NOT DETECTED');

if (failures.length) {
  console.error('PHASE5_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('PHASE5_CLOSURE_BASELINE_VALID');
console.log(`Focused governance tests present: ${tests.length}`);
console.log(`Historical due-diligence reports present: ${reports.length}`);
console.log('Authority boundary remains advisory/shadow L0; closure grants no runtime mutation authority.');
