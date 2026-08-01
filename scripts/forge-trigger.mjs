#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  classifyForgeMaintenanceIssue,
  classifyForgeIssueEligibility,
  claimForgeIssue,
  claimForgeMaintenanceIssue,
  FORGE_RESULTS,
  isForgeEligible,
  recordForgeTriggerHeartbeat,
  sanitizeText,
  selectForgeMaintenanceIssue
} from '../src/forge-trigger.js';
import { sendForgeReport } from '../src/forge-reporting.js';
import { startForgeExecution } from '../src/forge-execution.js';

const repo = 'moh0709/everythingAI';
const root = process.cwd();
const intervalMs = Number(process.env.FORGE_TRIGGER_INTERVAL_MS ?? 60_000);
const codexPath = process.env.FORGE_CODEX_PATH ?? 'codex';
const defaultControllerIssueNumber = process.env.FORGE_MAINTENANCE_CONTROLLER_ISSUE_NUMBER
  ? Number(process.env.FORGE_MAINTENANCE_CONTROLLER_ISSUE_NUMBER)
  : undefined;
const defaultCurrentExecutingIssueNumber = process.env.FORGE_CURRENT_ISSUE_NUMBER
  ? Number(process.env.FORGE_CURRENT_ISSUE_NUMBER)
  : undefined;

function gh(args) {
  const result = spawnSync('gh', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim() ?? 'gh command failed');
  return result.stdout.trim();
}

function gitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim() ?? 'git rev-parse failed');
  return result.stdout.trim();
}

function listIssues() {
  return JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'open', '--label', 'pm:ready', '--label', 'forge:ready', '--limit', '20', '--json', 'number,title,state,labels,url,body']));
}

function listMaintenanceIssues() {
  return JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'open', '--limit', '100', '--json', 'number,title,state,labels,url,body,updatedAt,createdAt']));
}

function fetchIssue(number) {
  return JSON.parse(gh(['issue', 'view', String(number), '--repo', repo, '--json', 'number,title,state,labels,url,body,updatedAt,createdAt']));
}

export function planLabelMutation(currentLabels, desiredLabels) {
  const current = new Set(currentLabels);
  const desired = new Set(desiredLabels);
  return {
    add: [...desired].filter((label) => !current.has(label)),
    remove: [...current].filter((label) => !desired.has(label))
  };
}

function updateLabels(number, labels) {
  const current = fetchIssue(number).labels.map((label) => typeof label === 'string' ? label : label.name).filter(Boolean);
  const mutation = planLabelMutation(current, labels);
  const args = ['issue', 'edit', String(number), '--repo', repo];
  for (const label of mutation.add) args.push('--add-label', label);
  for (const label of mutation.remove) args.push('--remove-label', label);
  if (args.length === 5) return;
  gh(args);
}

function postComment(issue, comment) {
  try { gh(['issue', 'comment', String(issue.number), '--repo', repo, '--body', comment]); return { ok: true }; }
  catch (error) { return { ok: false, error: error.message }; }
}

async function executeWithReporting({ contextPath, issue, repoRoot, reporter }) {
  const result = await startForgeExecution({ contextPath, repoRoot, codexPath });
  await reporter({ event: result.ok ? 'execution_completed' : 'execution_blocked', issue, contextPath });
  return result;
}

function maintenanceSummary({ processedIssueNumber, skipped = [] } = {}) {
  const processed = Number.isFinite(Number(processedIssueNumber)) ? String(Number(processedIssueNumber)) : 'none';
  const skippedText = skipped.length ? skipped.map(({ number, reason }) => `${number}:${reason}`).join(',') : 'none';
  return `maintenance_summary=processed:${processed} skipped:${skippedText}`;
}

function releasedSummary({ processedIssueNumber, skipped = [] } = {}) {
  const processed = Number.isFinite(Number(processedIssueNumber)) ? String(Number(processedIssueNumber)) : 'none';
  const skippedText = skipped.length ? skipped.map(({ number, reason }) => `${number}:${reason}`).join(',') : 'none';
  return `released_summary=processed:${processed} skipped:${skippedText}`;
}

export async function pollForgeOnce({ list = listIssues, listMaintenance = listMaintenanceIssues, fetch = fetchIssue, update = updateLabels, comment = postComment, reporter = sendForgeReport, repoRoot = root, execute = (args) => executeWithReporting({ ...args, repoRoot, reporter }), sha = 'unknown', projectState = readFileSync(resolve(repoRoot, 'PROJECT_STATE.md'), 'utf8'), bootstrap = readFileSync(resolve(repoRoot, 'AI_BOOTSTRAP.md'), 'utf8'), controllerIssueNumber = defaultControllerIssueNumber, currentExecutingIssueNumber = defaultCurrentExecutingIssueNumber, maintenanceStatePath = resolve(repoRoot, '.hermes/forge/maintenance-state.json'), now = () => new Date() } = {}) {
  const releasedIssues = await list();
  const releasedClassifications = releasedIssues.map((issue) => ({ issue, ...classifyForgeIssueEligibility(issue) }));
  const releasedSkipped = releasedClassifications
    .filter(({ eligible }) => !eligible)
    .map(({ issue, skipReason }) => ({ number: issue.number, reason: skipReason ?? 'not_eligible' }));
  const releasedSkipReasons = releasedSkipped.map(({ reason }) => reason).filter(Boolean);
  const issues = releasedClassifications.filter(({ eligible }) => eligible).map(({ issue }) => issue);
  if (issues.length) {
    const result = await claimForgeIssue({ issue: issues[0], fetchLiveIssue: fetch, updateLabels: update, postComment: comment, lockPath: resolve(repoRoot, '.hermes/forge/claim.lock'), repoRoot, startingSha: sha, projectState, bootstrap, reporter, execute });
    return {
      ...result,
      evidence: [
        ...(result.evidence ?? []),
        releasedSummary({ processedIssueNumber: issues[0].number, skipped: releasedSkipped }),
        ...(releasedSkipReasons.length ? [`released_skip_reasons=${[...new Set(releasedSkipReasons)].join(',')}`] : [])
      ]
    };
  }
  const maintenanceIssues = await listMaintenance();
  const maintenanceOptions = { controllerIssueNumber, currentExecutingIssueNumber, statePath: maintenanceStatePath, currentHeadSha: sha, now };
  const maintenance = selectForgeMaintenanceIssue(maintenanceIssues, maintenanceOptions);
  const skipped = maintenanceIssues
    .map((issue) => ({ number: issue.number, reason: classifyForgeMaintenanceIssue(issue, maintenanceOptions)?.skipReason }))
    .filter(({ reason }) => Boolean(reason));
  const skipReasons = skipped
    .map(({ reason }) => reason)
    .filter(Boolean);
  if (!maintenance) {
    return { ok: true, result: FORGE_RESULTS.IDLE, intervalMs, evidence: [`no eligible released or maintenance issue${[...new Set([...releasedSkipReasons, ...skipReasons])].length ? `; skip_reasons=${[...new Set([...releasedSkipReasons, ...skipReasons])].join(',')}` : ''}`, releasedSummary({ skipped: releasedSkipped }), maintenanceSummary({ skipped })] };
  }
  const result = await claimForgeMaintenanceIssue({ issue: maintenance.issue, fetchLiveIssue: fetch, updateLabels: update, postComment: comment, lockPath: resolve(repoRoot, '.hermes/forge/claim.lock'), repoRoot, statePath: maintenanceStatePath, controllerIssueNumber, currentExecutingIssueNumber, startingSha: sha, currentHeadSha: sha, projectState, bootstrap, reporter, execute, now });
  return {
    ...result,
    evidence: [
      ...(result.evidence ?? []),
      maintenanceSummary({ processedIssueNumber: maintenance.issue.number, skipped }),
      ...(skipReasons.length ? [`maintenance_skip_reasons=${[...new Set(skipReasons)].join(',')}`] : [])
    ]
  };
}

export async function watchForge({ iterations = Infinity, pauseMs = intervalMs, ...options } = {}) {
  const results = [];
  for (let index = 0; index < iterations; index += 1) {
    results.push(await pollForgeOnce(options));
    if (index + 1 < iterations) await new Promise((resolvePromise) => setTimeout(resolvePromise, pauseMs));
  }
  return results;
}

export function isDirectRun(moduleUrl, argvPath) {
  return Boolean(argvPath) && moduleUrl === pathToFileURL(resolve(argvPath)).href;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  let result;
  try {
    const sha = gitSha();
    result = process.argv.includes('--watch')
      ? await watchForge({ iterations: Number(process.env.FORGE_TRIGGER_ITERATIONS ?? 1), sha })
      : await pollForgeOnce({ sha });
  } catch (error) {
    result = { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, evidence: [sanitizeText(error.message)] };
    process.exitCode = 1;
  }
  recordForgeTriggerHeartbeat({ heartbeatPath: resolve(root, '.hermes/forge/trigger-heartbeat.json'), result });
  console.log(JSON.stringify(result, null, 2));
}
