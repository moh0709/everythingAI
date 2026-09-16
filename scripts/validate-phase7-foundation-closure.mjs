import fs from 'node:fs';

const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing required Phase 7 artifact: ${file}`);
};
const requireText = (file, text) => {
  requireFile(file);
  if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(text)) {
    failures.push(`${file} missing required text: ${text}`);
  }
};

const implementationFiles = [
  'services/api/src/archive/archiveProfileModel.js',
  'services/api/src/db/archiveProfileRepository.js',
  'services/api/src/archive/archivePlanner.js',
  'services/api/src/archive/archiveExecutor.js',
  'services/api/src/archive/metadataSidecar.js',
  'apps/everything-ai-ui/src/admin/archiveReviewModel.ts',
  'apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx',
];
implementationFiles.forEach(requireFile);

const tests = [
  'services/api/test/archiveProfileModel.test.js',
  'services/api/test/archivePlanner.test.js',
  'services/api/test/archiveExecutor.test.js',
  'services/api/test/metadataSidecar.test.js',
];
tests.forEach(requireFile);

requireText('services/api/src/archive/archivePlanner.js', "action: 'copy'");
requireText('services/api/src/archive/archivePlanner.js', 'filesystem_mutation_allowed: false');
requireText('services/api/src/archive/archiveExecutor.js', 'COPYFILE_EXCL');
requireText('services/api/src/archive/metadataSidecar.js', "flag: 'wx'");
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Approval here records intent only');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'No execute/run action exists');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 7 | Watcher integration |');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 8 | AI enrichment improvements |');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 9 | Advanced document intelligence |');

const releaseDecision = 'docs/PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_RELEASE_DECISION_2026-09-16.md';
const handover = 'docs/HANDOVER_2026-09-16_PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION.json';
requireText(releaseDecision, 'PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS');
requireText(releaseDecision, 'Stages 7–9 remain deferred');
requireText(handover, '"decision": "PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS"');
requireText(handover, '"accepted_stage_range": "2-6"');
requireText(handover, '"stages_7_to_9_deferred": true');

if (failures.length) {
  console.error('PHASE7_FOUNDATION_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE7_FOUNDATION_CLOSURE_EVIDENCE_VALID');
console.log(`Phase 7 implementation artifacts present: ${implementationFiles.length}`);
console.log(`Phase 7 focused backend tests present: ${tests.length}`);
console.log('Boundary preserved: foundation accepted through Stage 6 only; watcher integration, AI enrichment improvements and advanced document intelligence remain deferred.');
