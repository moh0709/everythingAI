#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { claimForgeIssue, FORGE_RESULTS, isForgeEligible } from '../src/forge-trigger.js';
import { sendForgeReport } from '../src/forge-reporting.js';

const repo = 'moh0709/everythingAI';
const root = process.cwd();
const intervalMs = Number(process.env.FORGE_TRIGGER_INTERVAL_MS ?? 60_000);

function gh(args) {
  const result = spawnSync('gh', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim() ?? 'gh command failed');
  return result.stdout.trim();
}

function listIssues() {
  return JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'open', '--label', 'pm:ready', '--label', 'forge:ready', '--limit', '20', '--json', 'number,title,state,labels,url,body'])).filter(isForgeEligible);
}

function fetchIssue(number) {
  return JSON.parse(gh(['issue', 'view', String(number), '--repo', repo, '--json', 'number,title,state,labels,url,body']));
}

function updateLabels(number, labels) {
  gh(['issue', 'edit', String(number), '--repo', repo, '--label', labels.join(',')]);
}

function postComment(issue, comment) {
  try { gh(['issue', 'comment', String(issue.number), '--repo', repo, '--body', comment]); return { ok: true }; }
  catch (error) { return { ok: false, error: error.message }; }
}

export async function pollForgeOnce({ list = listIssues, fetch = fetchIssue, update = updateLabels, comment = postComment, reporter = sendForgeReport, repoRoot = root, sha = 'unknown', projectState = readFileSync(resolve(repoRoot, 'PROJECT_STATE.md'), 'utf8'), bootstrap = readFileSync(resolve(repoRoot, 'AI_BOOTSTRAP.md'), 'utf8') } = {}) {
  const issues = await list();
  if (!issues.length) return { ok: true, result: FORGE_RESULTS.IDLE, intervalMs };
  return claimForgeIssue({ issue: issues[0], fetchLiveIssue: fetch, updateLabels: update, postComment: comment, lockPath: resolve(repoRoot, '.hermes/forge/claim.lock'), repoRoot, startingSha: sha, projectState, bootstrap, reporter });
}

export async function watchForge({ iterations = Infinity, pauseMs = intervalMs, ...options } = {}) {
  const results = [];
  for (let index = 0; index < iterations; index += 1) {
    results.push(await pollForgeOnce(options));
    if (index + 1 < iterations) await new Promise((resolvePromise) => setTimeout(resolvePromise, pauseMs));
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = process.argv.includes('--watch')
    ? await watchForge({ iterations: Number(process.env.FORGE_TRIGGER_ITERATIONS ?? 1) })
    : await pollForgeOnce({ sha: gh(['rev-parse', 'HEAD']) });
  console.log(JSON.stringify(result, null, 2));
}
