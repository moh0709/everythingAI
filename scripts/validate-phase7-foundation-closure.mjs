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
requireText('services/api/src/archive/metadataSidecar.js', "fs.open(sidecarPath, 'wx')");
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

const canonicalFiles = [
  'PROJECT_STATE.md',
  'AI_BOOTSTRAP.md',
  'docs/ROADMAP.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
];
for (const file of canonicalFiles) {
  requireText(file, 'PHASE7_AI_ORGANIZATION_WORKSPACE_FOUNDATION_PASS');
  requireText(file, '60a16f58321f599ed5f13b0319fbd712ba3e986a');
}

// Phase 7 remains an accepted historical foundation after later stages advance.
// Deferral of Stages 7–9 is historical Phase 7 release evidence, not a perpetual
// requirement on current canonical state. Later accepted phases may advance those
// stages while preserving the Phase 7 Stage 2–6 safety boundary.
requireText('PROJECT_STATE.md', 'Phase 7');
requireText('AI_BOOTSTRAP.md', 'Phase 7');
requireText('docs/ROADMAP.md', 'Phase 7 AI Organization Workspace Foundation');
requireText('docs/IMPLEMENTATION_ROADMAP.md', 'Accepted Phase 7');

if (failures.length) {
  console.error('PHASE7_FOUNDATION_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE7_FOUNDATION_CLOSURE_EVIDENCE_VALID');
console.log(`Phase 7 implementation artifacts present: ${implementationFiles.length}`);
console.log(`Phase 7 focused backend tests present: ${tests.length}`);
console.log(`Phase 7 canonical authority files synchronized: ${canonicalFiles.length}`);
console.log('Boundary preserved: Phase 7 remains accepted through Stage 6; later separately accepted phases may advance deferred stages without rewriting Phase 7 history.');
