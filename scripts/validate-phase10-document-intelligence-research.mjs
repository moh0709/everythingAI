import fs from 'node:fs';

const failures = [];
const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing required Phase 10 research artifact: ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};
const requireText = (file, text) => {
  const content = read(file);
  if (content && !content.includes(text)) failures.push(`${file} missing required text: ${text}`);
};

const reports = [
  'REPORTS/EAI-PHASE10-1-DOCUMENT-INTELLIGENCE-CAPABILITY-INVENTORY.md',
  'REPORTS/EAI-PHASE10-2-STRUCTURED-DOCUMENT-EVIDENCE-CONTRACT.md',
  'REPORTS/EAI-PHASE10-3-DOCUMENT-INTELLIGENCE-OPTIONS-RISK-MATRIX.md',
];
reports.forEach(read);

requireText(reports[0], 'Verified missing advanced intelligence');
requireText(reports[0], 'OCR fallback');
requireText(reports[0], 'provider-neutral structured extraction contract');

requireText(reports[1], 'Source fingerprint binding');
requireText(reports[1], 'Native text versus OCR arbitration');
requireText(reports[1], 'filesystem_mutation_allowed = false');
requireText(reports[1], 'execution_allowed = false');
requireText(reports[1], 'automatic_approval_allowed = false');

requireText(reports[2], 'isolated local Python sidecar/service');
requireText(reports[2], 'Do not install any of them yet');
requireText(reports[2], 'Docling');
requireText(reports[2], 'Tesseract');
requireText(reports[2], 'PaddleOCR / PP-StructureV3');
requireText(reports[2], 'PyMuPDF');
requireText(reports[2], 'AGPL');

requireText('docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md', '| 9 | Advanced document intelligence |');

const release = 'docs/PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_DECISION_2026-09-20.md';
const handover = 'docs/HANDOVER_2026-09-20_PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH.json';
requireText(release, 'PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS');
requireText(release, 'research and architecture milestone only');
requireText(release, 'does **not** claim that advanced document-intelligence runtime capability has been implemented');
requireText(handover, '"decision": "PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS"');
requireText(handover, '"advanced_document_intelligence_implemented": false');
requireText(handover, '"ocr_runtime_activated": false');
requireText(handover, '"python_sidecar_deployed": false');
requireText(handover, '"filesystem_mutation_authority_added": false');
requireText(handover, '"automatic_approval_or_execution_added": false');

const canonicalFiles = [
  'PROJECT_STATE.md',
  'AI_BOOTSTRAP.md',
  'docs/ROADMAP.md',
  'docs/IMPLEMENTATION_ROADMAP.md',
];
for (const file of canonicalFiles) {
  requireText(file, 'PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_PASS');
  requireText(file, '5e22e4aa7d45abe4001f88637d6437f927301886');
  requireText(file, '33999b1c9cb6777a1f7e1cfc6cf21391759d91a2');
  requireText(file, 'Structured Document Intelligence 1.0');
}
requireText('PROJECT_STATE.md', 'advanced document intelligence is not implemented');
requireText('AI_BOOTSTRAP.md', 'Advanced document-intelligence runtime remains **unimplemented**');
requireText('docs/ROADMAP.md', 'research/architecture PASS only');
requireText('docs/IMPLEMENTATION_ROADMAP.md', 'Runtime remains unchanged');

if (failures.length) {
  console.error('PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_INVALID');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('PHASE10_ADVANCED_DOCUMENT_INTELLIGENCE_RESEARCH_EVIDENCE_VALID');
console.log(`Phase 10 research reports present: ${reports.length}`);
console.log(`Phase 10 canonical authority files synchronized: ${canonicalFiles.length}`);
console.log('Boundary preserved: research/architecture only; advanced document-intelligence runtime remains unimplemented.');
