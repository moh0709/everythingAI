import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { qualifyStructuredDocumentFixtures } from '../services/api/src/extractors/structuredDocumentFixtureQualification.js';

const fixtureDir = path.resolve(
  process.cwd(),
  'services/api/test/fixtures/structured-document',
);

const fixtureNames = [
  'native-text.json',
  'ocr-labeled.json',
  'structured-table.json',
];

const entries = fixtureNames.map((name) => ({
  name,
  document: JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8')),
}));

const result = qualifyStructuredDocumentFixtures(entries);

console.log('EverythingAI Structured Document Fixture Qualification');
console.log(`Status: ${result.status.toUpperCase()}`);
console.log(`Digest: ${result.qualification_digest}`);
console.log(`Fixtures: ${result.aggregate.passed_count}/${result.aggregate.fixture_count} passed`);
console.log(`Modes: ${result.aggregate.extraction_modes.join(', ')}`);
console.log(`Pages: ${result.aggregate.total_pages} | Blocks: ${result.aggregate.total_blocks} | Tables: ${result.aggregate.total_tables} | Figures: ${result.aggregate.total_figures}`);
console.log(`Warnings: ${result.aggregate.total_warnings} | Plain-text chars: ${result.aggregate.total_plain_text_characters}`);
console.log('Authority: static fixtures only; no adapter transport, model execution, filesystem mutation, execution, or automatic approval.');

for (const fixture of result.results) {
  if (fixture.status === 'pass') {
    console.log(`PASS ${fixture.name}: mode=${fixture.extraction_mode} pages=${fixture.page_count} blocks=${fixture.block_count} tables=${fixture.table_count} figures=${fixture.figure_count}`);
  } else {
    console.log(`FAIL ${fixture.name}: ${fixture.error_code}`);
  }
}

if (result.status !== 'pass') process.exitCode = 1;
