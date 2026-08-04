import assert from 'node:assert/strict';
import test from 'node:test';

import { EligibilityEngine } from '../src/forge-eligibility.js';

const HEAD = 'a'.repeat(40);

function issue({
  number = 100,
  title = `EAI-TASK-${number}: Test issue`,
  state = 'OPEN',
  labels = ['pm:ready', 'forge:ready'],
  body = '',
  createdAt = '2026-08-01T00:00:00Z'
} = {}) {
  return {
    number,
    title,
    state,
    labels: labels.map((name) => ({ name })),
    body,
    createdAt
  };
}

test('EligibilityEngine skips closed and terminal PM-review issues', () => {
  const closed = issue({ number: 3, state: 'CLOSED' });
  const issue4 = issue({ number: 4, labels: ['pm:ready', 'forge:ready', 'forge:done', 'pm:review'] });
  const issue5 = issue({ number: 5, labels: ['pm:ready', 'forge:ready', 'forge:blocked', 'pm:review'] });
  const engine = new EligibilityEngine({ issues: [closed, issue4, issue5], currentHeadSha: HEAD });

  assert.ok(engine.evaluate(closed).reasons.includes('not_open'));
  assert.ok(engine.evaluate(issue4).reasons.includes('forge_done'));
  assert.ok(engine.evaluate(issue4).reasons.includes('pm_review'));
  assert.ok(engine.evaluate(issue5).reasons.includes('forge_blocked'));
  assert.ok(engine.evaluate(issue5).reasons.includes('pm_review'));
});

test('EligibilityEngine requires an explicit PM and Forge release', () => {
  const unreleased78 = issue({ number: 78, labels: [] });
  const equivalentOnly = issue({ number: 79, labels: ['pm:ready', 'forge:approved'] });

  const defaultEngine = new EligibilityEngine({ issues: [unreleased78, equivalentOnly], currentHeadSha: HEAD });
  assert.deepEqual(defaultEngine.evaluate(unreleased78).reasons, ['missing_pm_ready', 'missing_forge_ready']);
  assert.ok(defaultEngine.evaluate(equivalentOnly).reasons.includes('missing_forge_ready'));

  const configuredEngine = new EligibilityEngine({
    issues: [equivalentOnly],
    currentHeadSha: HEAD,
    approvedReadyLabels: ['forge:approved']
  });
  assert.equal(configuredEngine.evaluate(equivalentOnly).eligible, true);
});

test('EligibilityEngine prevents current, controller, and explicit maintenance issues from self-claiming', () => {
  const issue96 = issue({ number: 96 });
  const maintenance = issue({ number: 97, labels: ['pm:ready', 'forge:ready', 'maintenance'] });
  const engine = new EligibilityEngine({
    issues: [issue96, maintenance],
    currentHeadSha: HEAD,
    currentIssueNumber: 96,
    controllerIssueNumber: 96,
    maintenanceIssueNumbers: [96]
  });

  const self = engine.evaluate(issue96);
  assert.ok(self.reasons.includes('currently_executing'));
  assert.ok(self.reasons.includes('self_controller'));
  assert.ok(self.reasons.includes('maintenance_issue'));
  assert.ok(engine.evaluate(maintenance).reasons.includes('maintenance_issue'));
});

test('EligibilityEngine fails closed for unresolved and open dependencies', () => {
  const dependency68 = issue({ number: 68, title: 'EAI-TASK-045: Host deployment', labels: [], state: 'OPEN' });
  const issue69 = issue({
    number: 69,
    title: 'EAI-TASK-046: Reliability drill',
    body: 'Dependency: EAI-TASK-045 accepted and closed.'
  });
  const unresolved = issue({ number: 70, body: 'Blocked by: EAI-TASK-DOES-NOT-EXIST' });
  const engine = new EligibilityEngine({ issues: [dependency68, issue69, unresolved], currentHeadSha: HEAD });

  assert.ok(engine.evaluate(issue69).reasons.includes('dependency_blocked'));
  assert.ok(engine.evaluate(unresolved).reasons.includes('dependency_unresolved'));

  dependency68.state = 'CLOSED';
  const satisfied = new EligibilityEngine({ issues: [dependency68, issue69], currentHeadSha: HEAD });
  assert.equal(satisfied.evaluate(issue69).eligible, true);
  assert.deepEqual(satisfied.evaluate(issue69).dependencies, [68]);
});

test('EligibilityEngine preserves explicit PM dependency holds after declared dependencies close', () => {
  const dependency68 = issue({ number: 68, title: 'EAI-TASK-045: Host deployment', labels: [], state: 'CLOSED' });
  const issue69 = issue({
    number: 69,
    title: 'EAI-TASK-046: Reliability drill',
    state: 'CLOSED',
    labels: ['forge:done'],
    body: 'Dependency: EAI-TASK-045 accepted and closed.'
  });
  const engine = new EligibilityEngine({
    issues: [dependency68, issue69],
    currentHeadSha: HEAD,
    dependencyHoldIssueNumbers: [69]
  });

  assert.ok(engine.evaluate(issue69).reasons.includes('dependency_blocked'));
});

test('EligibilityEngine skips same-cycle and unchanged-HEAD processing history', () => {
  const candidate = issue({ number: 80 });
  const sameCycle = new EligibilityEngine({
    issues: [candidate],
    currentHeadSha: HEAD,
    cycleId: '2026-08-03',
    processedCycleId: '2026-08-03',
    processedIssues: [{ issueNumber: 80, headSha: 'b'.repeat(40) }]
  });
  assert.ok(sameCycle.evaluate(candidate).reasons.includes('already_processed'));

  const unchangedHead = new EligibilityEngine({
    issues: [candidate],
    currentHeadSha: HEAD,
    cycleId: '2026-08-03',
    processedCycleId: '2026-08-02',
    processedIssues: [{ issueNumber: 80, headSha: HEAD }]
  });
  assert.ok(unchangedHead.evaluate(candidate).reasons.includes('head_unchanged'));
});

test('EligibilityEngine sorts by dependency depth, priority, creation date, then issue number', () => {
  const closedBase = issue({ number: 10, title: 'EAI-TASK-010: Base', state: 'CLOSED', labels: [] });
  const oldestLow = issue({ number: 20, labels: ['pm:ready', 'forge:ready', 'priority:low'], createdAt: '2026-07-01T00:00:00Z' });
  const newerCritical = issue({ number: 21, labels: ['pm:ready', 'forge:ready', 'priority:critical'], createdAt: '2026-08-01T00:00:00Z' });
  const dependent = issue({
    number: 22,
    labels: ['pm:ready', 'forge:ready', 'priority:critical'],
    body: 'Depends on: #10',
    createdAt: '2026-06-01T00:00:00Z'
  });
  const tieLower = issue({ number: 23, createdAt: '2026-08-02T00:00:00Z' });
  const tieHigher = issue({ number: 24, createdAt: '2026-08-02T00:00:00Z' });
  const engine = new EligibilityEngine({
    issues: [tieHigher, dependent, oldestLow, closedBase, tieLower, newerCritical],
    currentHeadSha: HEAD
  });

  assert.deepEqual(engine.evaluateAll().filter(({ eligible }) => eligible).map(({ issueNumber }) => issueNumber), [21, 23, 24, 20, 22]);
  assert.equal(engine.select().issueNumber, 21);
});
