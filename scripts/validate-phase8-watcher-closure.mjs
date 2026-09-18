import fs from 'node:fs';

const failures = [];
const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing required Phase 8 artifact: ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};
const requireText = (file, text) => {
  const content = read(file);
  if (content && !content.includes(text)) failures.push(`${file} missing required text: ${text}`);
};
const forbidText = (file, text) => {
  const content = read(file);
  if (content.includes(text)) failures.push(`${file} contains forbidden Phase 8 authority text/import: ${text}`);
};

const implementationFiles = [
  'services/api/src/archive/archiveStaleState.js',
  'services/api/src/archive/archiveWatchAdapter.js',
  'services/api/src/watcher/watchService.js',
  'services/api/src/archive/archiveUpdatePreview.js',
  'apps/everything-ai-ui/src/admin/archiveReviewModel.ts',
  'apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx',
];
implementationFiles.forEach(read);

const tests = [
  'services/api/test/archiveStaleState.test.js',
  'services/api/test/archiveWatchAdapter.test.js',
  'services/api/test/watcherArchiveIntegration.test.js',
  'services/api/test/archiveUpdatePreview.test.js',
  'tests/archive-review-stale-model.test.mjs',
];
tests.forEach(read);

requireText('services/api/src/archive/archiveStaleState.js', "result('source_changed'");
requireText('services/api/src/archive/archiveStaleState.js', "result('archive_missing'");
requireText('services/api/src/archive/archiveStaleState.js', "result('archive_changed'");
requireText('services/api/src/archive/archiveStaleState.js', "result('sidecar_missing'");
requireText('services/api/src/archive/archiveStaleState.js', "result('conflict'");
requireText('services/api/src/archive/archiveStaleState.js', 'filesystem_mutation_allowed: false');

requireText('services/api/src/archive/archiveWatchAdapter.js', 'automatic_approval_allowed: false');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'execution_allowed: false');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'filesystem_mutation_allowed: false');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'stableCandidateId');

requireText('services/api/src/watcher/watchService.js', 'onArchiveWatchCycle');
requireText('services/api/src/watcher/watchService.js', 'archive_review');
requireText('services/api/src/watcher/watchService.js', "status: 'failed'");

requireText('services/api/src/archive/archiveUpdatePreview.js', 'automatic_approval_allowed: false');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'execution_allowed: false');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'filesystem_mutation_allowed: false');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'WATCH_CANDIDATE_SOURCE_FINGERPRINT_STALE');

requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Source changed');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Archive missing');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Manual review is required');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'No execute/run action exists');

for (const file of [
  'services/api/src/watcher/watchService.js',
  'services/api/src/archive/archiveWatchAdapter.js',
  'services/api/src/archive/archiveUpdatePreview.js',
]) {
  forbidText(file, "from './archiveExecutor.js'");
  forbidText(file, "from '../archive/archiveExecutor.js'");
  forbidText(file, "from './metadataSidecar.js'");
  forbidText(file, "from '../archive/metadataSidecar.js'");
}

requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 7 | Watcher integration |');

const releaseDecision = 'docs/PHASE8_WATCHER_STALE_PREVIEW_RELEASE_DECISION_2026-09-18.md';
const handover = 'docs/HANDOVER_2026-09-18_PHASE8_WATCHER_STALE_PREVIEW.json';
requireText(releaseDecision, 'PHASE8_WATCHER_STALE_PREVIEW_PASS');
requireText(releaseDecision, 'Watcher-driven archive execution remains prohibited');
requireText(handover, '"decision": "PHASE8_WATCHER_STALE_PREVIEW_PASS"');
requireText(handover, '"watcher_driven_execution": false');
requireText(handover, '"automatic_approval": false');
requireText(handover, '"archive_overwrite_authority": false');

const canonicalFiles = [
  'PROJECT_STATE.md',
  'AI_BOOTSTRAP.md',
  'docs/ROADMAP.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
];
for (const file of canonicalFiles) {
  requireText(file, 'PHASE8_WATCHER_STALE_PREVIEW_PASS');
  requireText(file, 'dbd5765d9d9a8df640ab9654889b9ac6cbed8c9f');
  requireText(file, 'c2398c9c5e4007fd7fbdc2f31561365cf93e5d58');
}
requireText('PROJECT_STATE.md', 'Stage 8 AI enrichment improvements');
requireText('AI_BOOTSTRAP.md', 'Stage 8 AI enrichment improvements');
requireText('docs/ROADMAP.md', 'Stage 8 AI enrichment improvements');
requireText('docs/IMPLEMENTATION_ROADMAP.md', 'Stage 8 — AI enrichment improvements');

if (failures.length) {
  console.error('PHASE8_WATCHER_STALE_PREVIEW_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE8_WATCHER_STALE_PREVIEW_CLOSURE_EVIDENCE_VALID');
console.log(`Phase 8 implementation artifacts present: ${implementationFiles.length}`);
console.log(`Phase 8 focused tests present: ${tests.length}`);
console.log(`Phase 8 canonical authority files synchronized: ${canonicalFiles.length}`);
console.log('Boundary preserved: watcher integration creates stale/review evidence and previews only; no automatic approval, execution, overwrite, or source mutation authority.');
