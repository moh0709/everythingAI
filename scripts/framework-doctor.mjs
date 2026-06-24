#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const requiredFiles = [
  'package.json',
  'scripts/task-poller.mjs',
  'scripts/task-worker.mjs',
  'scripts/framework-doctor.mjs',
  'src/task-queue.js',
  'templates/ISSUE_TEMPLATE_TASK.md',
  'templates/ISSUE_TEMPLATE_BUGFIX.md',
  'templates/ISSUE_TEMPLATE_REVIEW.md',
  'templates/REPORT_TEMPLATE.md',
  'templates/STATE_TEMPLATE.json',
  'skills/hermes-pm-framework.skill.md',
  'skills/hermes-pm-framework.prompt.json',
  'LOGS',
  'REPORTS'
];

function checkGh() {
  const status = spawnSync('gh', ['auth', 'status', '--hostname', 'github.com'], { encoding: 'utf8' });
  if (status.error) {
    return { ok: false, detail: 'gh auth status failed to run' };
  }
  return {
    ok: status.status === 0,
    detail: status.status === 0 ? 'gh authenticated' : 'gh auth status reported a failure'
  };
}

const results = [];
let ok = true;

for (const relativePath of requiredFiles) {
  const absolute = resolve(repoRoot, relativePath);
  const present = existsSync(absolute);
  results.push({ path: relativePath, present });
  ok = ok && present;
}

const gh = checkGh();
ok = ok && gh.ok;

const statePath = resolve(repoRoot, '.hermes/state.json');
const statePresent = existsSync(statePath);
let stateSummary = 'absent';
if (statePresent) {
  try {
    JSON.parse(readFileSync(statePath, 'utf8'));
    stateSummary = 'valid json';
  } catch (error) {
    ok = false;
    stateSummary = `invalid json: ${error.message}`;
  }
}

console.log(JSON.stringify({
  repoRoot,
  status: ok ? 'PASS' : 'WARN',
  gh,
  state: stateSummary,
  files: results
}, null, 2));

process.exitCode = ok ? 0 : 1;