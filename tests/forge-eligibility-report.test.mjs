import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { EligibilityReport } from '../src/forge-eligibility-report.js';

test('EligibilityReport writes every evaluation and exact skip reasons atomically', () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-eligibility-report-'));
  const reportPath = join(root, 'nested', 'eligibility-report.json');
  const report = new EligibilityReport({
    runId: 'run-1',
    cycleId: '2026-08-03',
    headSha: 'a'.repeat(40),
    startedAt: '2026-08-03T10:00:00.000Z',
    currentIssueNumber: 96,
    controllerIssueNumber: 96,
    approvedReadyLabels: []
  });

  report.record({
    issue: { number: 4, title: 'UI', state: 'OPEN', labels: [{ name: 'forge:done' }, { name: 'pm:review' }] },
    issueNumber: 4,
    eligible: false,
    reasons: ['forge_done', 'pm_review'],
    primaryReason: 'forge_done',
    dependencies: [],
    dependencyDepth: 0,
    priorityRank: 2,
    createdAt: '2026-04-28T14:25:31.000Z'
  });
  report.record({
    issue: { number: 100, title: 'Ready', state: 'OPEN', labels: [{ name: 'pm:ready' }, { name: 'forge:ready' }] },
    issueNumber: 100,
    eligible: true,
    reasons: [],
    primaryReason: null,
    dependencies: [],
    dependencyDepth: 0,
    priorityRank: 2,
    createdAt: '2026-08-03T09:00:00.000Z'
  });
  report.complete({
    selectedIssueNumber: 100,
    outcome: 'SELECTED',
    message: 'Selected issue #100',
    completedAt: '2026-08-03T10:00:01.000Z'
  });
  report.write(reportPath);

  const persisted = JSON.parse(readFileSync(reportPath, 'utf8'));
  assert.equal(persisted.schemaVersion, 1);
  assert.equal(persisted.runId, 'run-1');
  assert.equal(persisted.issues.length, 2);
  assert.deepEqual(persisted.issues[0].reasons, ['forge_done', 'pm_review']);
  assert.equal(persisted.selectedIssueNumber, 100);
  assert.equal(persisted.outcome, 'SELECTED');
  assert.equal(persisted.completedAt, '2026-08-03T10:00:01.000Z');
  assert.equal(existsSync(reportPath), true);
  assert.deepEqual(readdirSync(join(root, 'nested')), ['eligibility-report.json']);
});

test('EligibilityReport redacts secret-shaped report values', () => {
  const report = new EligibilityReport({
    runId: 'run-2',
    cycleId: '2026-08-03',
    headSha: 'b'.repeat(40),
    startedAt: '2026-08-03T10:00:00.000Z'
  });
  report.complete({
    outcome: 'RUNTIME_ERROR',
    message: 'token=gho_abcdefghijklmnopqrstuvwxyz',
    evidence: ['8995460068:AAFfFakeTokenLongEnoughForRedaction']
  });

  const serialized = JSON.stringify(report.toJSON());
  assert.doesNotMatch(serialized, /gho_|8995460068/);
  assert.match(serialized, /REDACTED/);
});

test('EligibilityReport records the exact empty-queue message', () => {
  const report = new EligibilityReport({ runId: 'run-3', cycleId: '2026-08-03' });
  report.complete({ outcome: 'IDLE', message: 'No eligible issues found', selectedIssueNumber: null });

  assert.equal(report.toJSON().message, 'No eligible issues found');
  assert.equal(report.toJSON().selectedIssueNumber, null);
});
