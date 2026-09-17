import fs from 'node:fs';

const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing required Phase 8 artifact: ${file}`);
};
const read = (file) => {
  requireFile(file);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};
const requireText = (file, text) => {
  const content = read(file);
  if (content && !content.includes(text)) failures.push(`${file} missing required text: ${text}`);
};
const forbidText = (file, text) => {
  const content = read(file);
  if (content.includes(text)) failures.push(`${file} contains forbidden Phase 8 authority coupling: ${text}`);
};

const implementationFiles = [
  'services/api/src/archive/archiveStaleState.js',
  'services/api/src/archive/archiveWatchAdapter.js',
  'services/api/src/watcher/watchService.js',
  'services/api/src/archive/archiveUpdatePreview.js',
  'apps/everything-ai-ui/src/admin/archiveReviewModel.ts',
  'apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx',
];
implementationFiles.forEach(requireFile);

const backendTests = [
  'services/api/test/archiveStaleState.test.js',
  'services/api/test/archiveWatchAdapter.test.js',
  'services/api/test/watcherArchiveIntegration.test.js',
  'services/api/test/archiveUpdatePreview.test.js',
];
backendTests.forEach(requireFile);
requireFile('tests/archive-review-stale-model.test.mjs');

for (const staleState of [
  'current',
  'source_changed',
  'archive_missing',
  'archive_changed',
  'sidecar_missing',
  'conflict',
]) {
  requireText('services/api/src/archive/archiveStaleState.js', `'${staleState}'`);
}
requireText('services/api/src/archive/archiveStaleState.js', 'filesystem_mutation_allowed: false');

requireText('services/api/src/archive/archiveWatchAdapter.js', 'candidate_id');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'execution_allowed: false');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'automatic_approval_allowed: false');
requireText('services/api/src/archive/archiveWatchAdapter.js', 'filesystem_mutation_allowed: false');

requireText('services/api/src/watcher/watchService.js', 'onArchiveWatchCycle');
requireText('services/api/src/watcher/watchService.js', "source: 'watcher'");
forbidText('services/api/src/watcher/watchService.js', "from '../archive/archiveExecutor.js'");
forbidText('services/api/src/watcher/watchService.js', "from '../archive/metadataSidecar.js'");
forbidText('services/api/src/watcher/watchService.js', 'executeArchivePlan(');
forbidText('services/api/src/watcher/watchService.js', 'writeArchiveMetadataSidecar(');

requireText('services/api/src/archive/archiveUpdatePreview.js', "proposal_type: staleState === 'source_changed' ? 'update_preview' : 'rebuild_preview'");
requireText('services/api/src/archive/archiveUpdatePreview.js', "proposal_type: 'sidecar_regeneration_preview'");
requireText('services/api/src/archive/archiveUpdatePreview.js', "proposal_type: 'manual_review'");
requireText('services/api/src/archive/archiveUpdatePreview.js', 'WATCH_CANDIDATE_SOURCE_FINGERPRINT_STALE');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'automatic_approval_allowed: false');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'execution_allowed: false');
requireText('services/api/src/archive/archiveUpdatePreview.js', 'filesystem_mutation_allowed: false');
forbidText('services/api/src/archive/archiveUpdatePreview.js', "from './archiveExecutor.js'");
forbidText('services/api/src/archive/archiveUpdatePreview.js', "from './metadataSidecar.js'");

requireText('apps/everything-ai-ui/src/admin/archiveReviewModel.ts', "'archive_changed'");
requireText('apps/everything-ai-ui/src/admin/archiveReviewModel.ts', "'sidecar_missing'");
requireText('apps/everything-ai-ui/src/admin/archiveReviewModel.ts', "['archive_changed', 'conflict']");
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Approval here records intent only');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'No execute/run action exists');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Manual review is required for this archive state');

const releaseDecision = 'docs/PHASE8_WATCHER_STALE_PREVIEW_RELEASE_DECISION_2026-09-17.md';
const handover = 'docs/HANDOVER_2026-09-17_PHASE8_WATCHER_STALE_PREVIEW.json';
requireText(releaseDecision, 'PHASE8_WATCHER_STALE_PREVIEW_PASS');
requireText(releaseDecision, 'closure candidate');
requireText(handover, '"decision": "PHASE8_WATCHER_STALE_PREVIEW_PASS"');
requireText(handover, '"decision_state": "CLOSURE_CANDIDATE"');
requireText(handover, '"canonical_sync_after_acceptance": true');

if (failures.length) {
  console.error('PHASE8_WATCHER_STALE_PREVIEW_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE8_WATCHER_STALE_PREVIEW_EVIDENCE_VALID');
console.log(`Phase 8 implementation artifacts present: ${implementationFiles.length}`);
console.log(`Phase 8 focused backend tests present: ${backendTests.length}`);
console.log('Phase 8 root Admin stale-review test present: 1');
console.log('Boundary preserved: watcher integration remains review/preview-only; no watcher-to-executor or watcher-to-sidecar-writer coupling detected.');
