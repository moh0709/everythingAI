import fs from 'node:fs';

const failures = [];
const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing required Phase 11 artifact: ${file}`);
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
  if (content.includes(text)) failures.push(`${file} contains forbidden Phase 11 runtime activation text/import: ${text}`);
};

const runtimeFiles = [
  'services/api/src/extractors/structuredDocumentContract.js',
  'services/api/src/extractors/structuredDocumentAdapterProtocol.js',
  'services/api/src/extractors/structuredExtractionShadowBridge.js',
  'services/api/src/extractors/structuredDocumentFixtureQualification.js',
  'services/api/src/extractors/extractionRunner.js',
];
runtimeFiles.forEach(read);

const focusedTests = [
  'services/api/test/structuredDocumentContract.test.js',
  'services/api/test/structuredDocumentAdapterProtocol.test.js',
  'services/api/test/structuredExtractionShadowBridge.test.js',
  'services/api/test/structuredDocumentFixtureQualification.test.js',
];
focusedTests.forEach(read);

const fixtures = [
  'services/api/test/fixtures/structured-document/native-text.json',
  'services/api/test/fixtures/structured-document/ocr-labeled.json',
  'services/api/test/fixtures/structured-document/structured-table.json',
];
fixtures.forEach(read);

requireText('services/api/src/extractors/structuredDocumentContract.js', 'provider_neutral: true');
requireText('services/api/src/extractors/structuredDocumentContract.js', 'model_execution_required: false');
requireText('services/api/src/extractors/structuredDocumentContract.js', 'filesystem_mutation_allowed: false');

requireText('services/api/src/extractors/structuredDocumentAdapterProtocol.js', "transport: 'injected_local'");
requireText('services/api/src/extractors/structuredDocumentAdapterProtocol.js', 'local_only: true');
requireText('services/api/src/extractors/structuredDocumentAdapterProtocol.js', 'hidden_fallback_allowed: false');
requireText('services/api/src/extractors/structuredDocumentAdapterProtocol.js', 'child_process_spawn_enabled: false');

requireText('services/api/src/extractors/structuredExtractionShadowBridge.js', "mode: 'shadow_preview'");
requireText('services/api/src/extractors/structuredExtractionShadowBridge.js', 'legacy_persistence_authoritative: true');
requireText('services/api/src/extractors/structuredExtractionShadowBridge.js', 'structured_persistence_allowed: false');
requireText('services/api/src/extractors/structuredExtractionShadowBridge.js', 'search_index_replacement_allowed: false');

requireText('services/api/src/extractors/structuredDocumentFixtureQualification.js', "mode: 'static_fixture_qualification'");
requireText('services/api/src/extractors/structuredDocumentFixtureQualification.js', 'adapter_transport_invoked: false');
requireText('scripts/diagnose-structured-document-fixtures.mjs', 'static fixtures only');

for (const file of [
  'services/api/src/extractors/structuredDocumentAdapterProtocol.js',
  'services/api/src/extractors/structuredExtractionShadowBridge.js',
  'services/api/src/extractors/structuredDocumentFixtureQualification.js',
]) {
  forbidText(file, "node:child_process");
  forbidText(file, "docling");
  forbidText(file, "paddleocr");
  forbidText(file, "tesseract");
  forbidText(file, "pymupdf");
}

const release = 'docs/PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_RELEASE_DECISION_2026-09-21.md';
const handover = 'docs/HANDOVER_2026-09-21_PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION.json';
requireText(release, 'PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_PASS');
requireText(release, 'model/provider-free');
requireText(release, 'does not authorize OCR/model execution');
requireText(handover, '"decision": "PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_PASS"');
requireText(handover, '"ocr_or_model_execution_activated": false');
requireText(handover, '"python_sidecar_deployed": false');
requireText(handover, '"structured_persistence_activated": false');
requireText(handover, '"legacy_extracted_text_authority_replaced": false');
requireText(handover, '"filesystem_mutation_authority_added": false');

if (failures.length) {
  console.error('PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PHASE11_STRUCTURED_DOCUMENT_INTELLIGENCE_FOUNDATION_EVIDENCE_VALID');
console.log(`Phase 11 runtime boundary files present: ${runtimeFiles.length}`);
console.log(`Phase 11 focused tests present: ${focusedTests.length}`);
console.log(`Phase 11 deterministic fixtures present: ${fixtures.length}`);
console.log('Boundary preserved: model/provider-free read-only structured-document foundation; legacy extraction remains persistence/search authority; no OCR/model/runtime dependency activation.');
