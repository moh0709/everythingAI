import fs from 'node:fs';

const failures = [];

const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing required Phase 9 artifact: ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const requireText = (file, text) => {
  const content = read(file);
  if (content && !content.includes(text)) {
    failures.push(`${file} missing required text: ${text}`);
  }
};

const forbidText = (file, text) => {
  const content = read(file);
  if (content.includes(text)) {
    failures.push(`${file} contains forbidden Phase 9 authority/provider text: ${text}`);
  }
};

const implementationFiles = [
  'services/api/src/archive/archiveEnrichmentPolicy.js',
  'services/api/src/archive/archivePlanner.js',
  'services/api/src/archive/metadataSidecar.js',
  'apps/everything-ai-ui/src/admin/archiveReviewModel.ts',
  'apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx',
];
implementationFiles.forEach(read);

const focusedTests = [
  'services/api/test/archiveEnrichmentPolicy.test.js',
  'services/api/test/archivePlanner.test.js',
  'services/api/test/metadataSidecar.test.js',
  'tests/archive-review-enrichment-model.test.mjs',
];
focusedTests.forEach(read);

// 9.1 policy boundary.
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', "const ALLOWED_FIELDS = Object.freeze(['classification', 'summary', 'tags'])");
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', "throw new Error('AI_ENRICHMENT_DISABLED')");
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'requires_field_provenance: true');
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'requires_evidence_refs: true');
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'provider_neutral: true');
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'filesystem_mutation_allowed: false');
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'execution_allowed: false');
requireText('services/api/src/archive/archiveEnrichmentPolicy.js', 'automatic_approval_allowed: false');

// 9.2 preview-only planner integration.
requireText('services/api/src/archive/archivePlanner.js', "mode: 'preview_only'");
requireText('services/api/src/archive/archivePlanner.js', 'normalizeArchiveEnrichment');
requireText('services/api/src/archive/archivePlanner.js', 'generated_metadata: snapshot.generated_metadata');
requireText('services/api/src/archive/archivePlanner.js', 'filesystem_mutation_allowed: false');
requireText('services/api/src/archive/archivePlanner.js', 'execution_allowed: false');
requireText('services/api/src/archive/archivePlanner.js', 'automatic_approval_allowed: false');

// 9.3 sidecar + user provenance.
requireText('services/api/src/archive/metadataSidecar.js', "fs.open(sidecarPath, 'wx')");
requireText('services/api/src/archive/metadataSidecar.js', "throw new Error('ACCEPTED_EXECUTION_REQUIRED')");
requireText('services/api/src/archive/metadataSidecar.js', "throw new Error('EXACT_APPROVAL_REQUIRED')");
requireText('services/api/src/archive/metadataSidecar.js', "throw new Error('METADATA_SOURCE_AMBIGUOUS')");
requireText('services/api/src/archive/metadataSidecar.js', "throw new Error('UNSAFE_ENRICHMENT_AUTHORITY')");
requireText('services/api/src/archive/metadataSidecar.js', 'replaced_ai_generated');
requireText('services/api/src/archive/metadataSidecar.js', 'prior_generated_by');
requireText('services/api/src/archive/metadataSidecar.js', 'prior_evidence_refs');
requireText('services/api/src/archive/metadataSidecar.js', 'SENSITIVE_FIELD_FORBIDDEN');
requireText('services/api/src/archive/metadataSidecar.js', 'SECRET_BEARING_VALUE_FORBIDDEN');

// 9.4 Admin visibility remains review/preference-only.
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'AI metadata enrichment');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Enabled for future preview generation');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'does not call a model');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'No execute/run action exists');
requireText('apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx', 'Metadata provenance');
requireText('apps/everything-ai-ui/src/admin/archiveReviewModel.ts', 'deriveArchiveMetadataProvenance');
requireText('apps/everything-ai-ui/src/admin/archiveReviewModel.ts', "origin: 'ai_generated' | 'user_edited' | 'user_authored'");

// Provider-neutral foundation: no direct provider SDK/import or provider-specific execution.
for (const file of [
  'services/api/src/archive/archiveEnrichmentPolicy.js',
  'services/api/src/archive/archivePlanner.js',
]) {
  for (const forbidden of [
    "from 'openai'",
    'from "openai"',
    "from '@anthropic-ai/sdk'",
    'from "@anthropic-ai/sdk"',
    "from '@google/generative-ai'",
    'from "@google/generative-ai"',
    'chat.completions.create',
    'messages.create(',
    'generateContent(',
  ]) {
    forbidText(file, forbidden);
  }
}

// Accepted design boundary.
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 8 | AI enrichment improvements |');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', 'user can disable AI metadata enrichment');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', 'AI-generated fields must be identified field-by-field');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', 'user-edited fields must replace or supplement generated values with provenance');
requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 9 | Advanced document intelligence |');

const releaseDecision = 'docs/PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_RELEASE_DECISION_2026-09-18.md';
const handover = 'docs/HANDOVER_2026-09-18_PHASE9_AI_METADATA_ENRICHMENT_CONTROLS.json';
requireText(releaseDecision, 'PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS');
requireText(releaseDecision, 'advanced document intelligence remains deferred');
requireText(handover, '"decision": "PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS"');
requireText(handover, '"provider_neutral": true');
requireText(handover, '"filesystem_mutation_authority_added": false');
requireText(handover, '"automatic_approval_or_execution_added": false');
requireText(handover, '"advanced_document_intelligence_included": false');

const canonicalFiles = [
  'PROJECT_STATE.md',
  'AI_BOOTSTRAP.md',
  'docs/ROADMAP.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
];
for (const file of canonicalFiles) {
  requireText(file, 'PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_PASS');
  requireText(file, '14e32cbbb5cd154301a52f4bc86dcdd4e71ce331');
  requireText(file, 'd8cf36b3959d97efdd2b7689923cb94239a38e48');
}
// Phase 9 remains accepted historical enrichment authority after later phases
// separately advance document-intelligence research/foundation work. Phase 9's
// own release/handover continue to prove that advanced document intelligence
// was excluded at Phase 9 closure; current canonical state may describe later
// accepted phases without rewriting Phase 9 history.
requireText('PROJECT_STATE.md', 'Phase 9');
requireText('AI_BOOTSTRAP.md', 'Phase 9');
requireText('docs/ROADMAP.md', 'Phase 9');
requireText('docs/IMPLEMENTATION_ROADMAP.md', 'Phase 9');
requireText('PROJECT_STATE.md', 'PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_PASS');

if (failures.length) {
  console.error('PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_CLOSURE_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE9_AI_METADATA_ENRICHMENT_CONTROLS_CLOSURE_EVIDENCE_VALID');
console.log(`Phase 9 implementation artifacts present: ${implementationFiles.length}`);
console.log(`Phase 9 focused tests present: ${focusedTests.length}`);
console.log(`Phase 9 canonical authority files synchronized: ${canonicalFiles.length}`);
console.log('Boundary preserved: Phase 9 provider-neutral enrichment controls/provenance remain accepted historical authority; later separately accepted phases do not rewrite Phase 9 closure scope.');
