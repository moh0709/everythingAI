import fs from 'node:fs';
import path from 'node:path';

const fail = (message) => {
  console.error(`GOVERNANCE_CONTINUITY_INVALID: ${message}`);
  process.exitCode = 1;
};

const read = (file) => fs.readFileSync(file, 'utf8');

const requireText = (content, needle, label) => {
  if (!content.includes(needle)) fail(`${label} is missing required text: ${needle}`);
};

const adrPath = 'docs/ADR-005-013_GOVERNANCE_SESSION_HANDOVER_CONTINUITY.md';
const templatePath = 'docs/GOVERNANCE_HANDOVER_TEMPLATE.md';

for (const file of [adrPath, templatePath]) {
  if (!fs.existsSync(file)) fail(`required governance artifact is missing: ${file}`);
}

if (!process.exitCode) {
  const adr = read(adrPath);
  requireText(adr, 'Status: Accepted', 'ADR-005-013');
  requireText(adr, '## Authority Boundary', 'ADR-005-013');
  requireText(adr, 'does **not** itself activate runtime enforcement', 'ADR-005-013');
  requireText(adr, '## Governance Continuity Validation', 'ADR-005-013');
  requireText(adr, '## Rollback', 'ADR-005-013');

  const template = read(templatePath);
  const requiredTemplateSections = [
    '# 1. Handover Metadata',
    '# 2. Current Governance State',
    '# 3. Rollout Maturity',
    '# 4. Active Invariants',
    '# 5. Enforcement Maturity',
    '# 6. Blast-Radius State',
    '# 7. Recovery-Boundary Status',
    '# 8. Unresolved Governance Risks',
    '# 9. Operational Readiness Status',
    '# 10. Governance Contracts',
    '# 11. Critical Architectural Assumptions',
    '# 12. Forbidden Patterns',
    '# 13. Exact Acceptance and Evidence References',
    '# 14. Rollback Boundary',
    '# 15. Next Approved Governance Actions',
    '# 16. Continuity Validation Checklist',
    '# 17. Acceptance'
  ];
  for (const section of requiredTemplateSections) requireText(template, section, 'governance handover template');
  requireText(template, 'does not itself activate runtime enforcement', 'governance handover template');
  requireText(template, 'Known missing evidence:', 'governance handover template');

  for (const suppliedPath of process.argv.slice(2)) {
    const resolved = path.normalize(suppliedPath);
    if (!fs.existsSync(resolved)) {
      fail(`requested handover does not exist: ${resolved}`);
      continue;
    }
    const handover = read(resolved);
    const requiredHandoverHeadings = [
      '# 1. Handover Metadata',
      '# 2. Current Governance State',
      '# 3. Rollout Maturity',
      '# 4. Active Invariants',
      '# 5. Enforcement Maturity',
      '# 6. Blast-Radius State',
      '# 7. Recovery-Boundary Status',
      '# 8. Unresolved Governance Risks',
      '# 9. Operational Readiness Status',
      '# 10. Governance Contracts',
      '# 11. Critical Architectural Assumptions',
      '# 12. Forbidden Patterns',
      '# 13. Exact Acceptance and Evidence References',
      '# 14. Rollback Boundary',
      '# 15. Next Approved Governance Actions',
      '# 16. Continuity Validation Checklist',
      '# 17. Acceptance'
    ];
    for (const heading of requiredHandoverHeadings) requireText(handover, heading, resolved);
  }
}

if (!process.exitCode) console.log('GOVERNANCE_CONTINUITY_PASS');
