#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  acquireForgeLock,
  claimForgeIssue,
  FORGE_RESULTS,
  readForgeProcessingState,
  recordForgeTriggerHeartbeat,
  releaseForgeLock,
  sanitizeText
} from '../src/forge-trigger.js';
import { EligibilityEngine } from '../src/forge-eligibility.js';
import { EligibilityReport } from '../src/forge-eligibility-report.js';
import { sendForgeReport } from '../src/forge-reporting.js';
import { startForgeExecution } from '../src/forge-execution.js';

const repo = 'moh0709/everythingAI';
const root = process.cwd();
const intervalMs = Number(process.env.FORGE_TRIGGER_INTERVAL_MS ?? 60_000);
const codexPath = process.env.FORGE_CODEX_PATH ?? 'codex';
const defaultControllerIssueNumber = process.env.FORGE_MAINTENANCE_CONTROLLER_ISSUE_NUMBER
  ? Number(process.env.FORGE_MAINTENANCE_CONTROLLER_ISSUE_NUMBER)
  : 96;
const defaultCurrentExecutingIssueNumber = process.env.FORGE_CURRENT_ISSUE_NUMBER
  ? Number(process.env.FORGE_CURRENT_ISSUE_NUMBER)
  : undefined;
const defaultApprovedReadyLabels = String(process.env.FORGE_APPROVED_READY_LABELS ?? '')
  .split(',')
  .map((label) => label.trim())
  .filter(Boolean);

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
  return JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000', '--json', 'number,title,state,labels,url,body,updatedAt,createdAt']));
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

export async function pollForgeOnce({ list = listIssues, fetch = fetchIssue, update = updateLabels, comment = postComment, reporter = sendForgeReport, repoRoot = root, execute = (args) => executeWithReporting({ ...args, repoRoot, reporter }), sha = 'unknown', projectState = readFileSync(resolve(repoRoot, 'PROJECT_STATE.md'), 'utf8'), bootstrap = readFileSync(resolve(repoRoot, 'AI_BOOTSTRAP.md'), 'utf8'), controllerIssueNumber = defaultControllerIssueNumber, currentExecutingIssueNumber = defaultCurrentExecutingIssueNumber, approvedReadyLabels = defaultApprovedReadyLabels, maintenanceIssueNumbers = [], processingStatePath = resolve(repoRoot, '.hermes/forge/maintenance-state.json'), eligibilityReportPath = resolve(repoRoot, '.hermes/forge/eligibility-report.json'), now = () => new Date() } = {}) {
  const startedAt = now().toISOString();
  const cycleId = startedAt.slice(0, 10);
  const report = new EligibilityReport({
    cycleId,
    headSha: sha,
    startedAt,
    currentIssueNumber: currentExecutingIssueNumber,
    controllerIssueNumber,
    approvedReadyLabels
  });
  const lockPath = resolve(repoRoot, '.hermes/forge/claim.lock');
  const schedulerLock = acquireForgeLock({
    lockPath,
    issueNumber: 0,
    now
  });
  if (!schedulerLock.ok) {
    report.complete({ outcome: schedulerLock.result, message: 'Forge scheduler claim lock unavailable', evidence: schedulerLock.evidence, completedAt: now().toISOString() });
    try {
      report.write(eligibilityReportPath);
    } catch (error) {
      return {
        ok: false,
        result: FORGE_RESULTS.RUNTIME_ERROR,
        message: 'Forge eligibility report write failed',
        eligibilityReportPath,
        evidence: [...(schedulerLock.evidence ?? []), sanitizeText(error.message)]
      };
    }
    return { ok: false, ...schedulerLock, message: 'Forge scheduler claim lock unavailable', eligibilityReportPath };
  }

  try {
    const issues = await list();
    const processingState = readForgeProcessingState(processingStatePath);
    const engineOptions = {
      issues,
      approvedReadyLabels,
      currentHeadSha: sha,
      currentIssueNumber: currentExecutingIssueNumber,
      controllerIssueNumber,
      maintenanceIssueNumbers: [...maintenanceIssueNumbers, controllerIssueNumber].filter(Number.isFinite),
      cycleId,
      processedCycleId: processingState.cycleId,
      processedIssues: processingState.processedIssues
    };
    const engine = new EligibilityEngine(engineOptions);
    const evaluations = engine.evaluateAll();
    for (const evaluation of evaluations) report.record(evaluation);
    const selected = evaluations.find(({ eligible }) => eligible) ?? null;
    const skippedEvidence = evaluations
      .filter(({ eligible }) => !eligible)
      .map(({ issueNumber, reasons }) => `#${issueNumber} skipped ${reasons.join('|')}`);

    if (!selected) {
      const message = 'No eligible issues found';
      report.complete({ outcome: FORGE_RESULTS.IDLE, message, selectedIssueNumber: null, evidence: skippedEvidence, completedAt: now().toISOString() });
      report.write(eligibilityReportPath);
      return { ok: true, result: FORGE_RESULTS.IDLE, message, intervalMs, eligibilityReportPath, evidence: skippedEvidence };
    }

    report.complete({ outcome: 'SELECTED', message: `Selected issue #${selected.issueNumber}`, selectedIssueNumber: selected.issueNumber, evidence: skippedEvidence, completedAt: now().toISOString() });
    report.write(eligibilityReportPath);
    const result = await claimForgeIssue({
      issue: selected.issue,
      fetchLiveIssue: fetch,
      fetchIssueUniverse: list,
      updateLabels: update,
      postComment: comment,
      lockPath,
      repoRoot,
      processingStatePath,
      eligibilityOptions: engineOptions,
      heldLock: schedulerLock.lock,
      startingSha: sha,
      projectState,
      bootstrap,
      reporter,
      execute
    });
    report.complete({ outcome: result.result, message: result.ok ? `Claimed issue #${selected.issueNumber}` : `Did not claim issue #${selected.issueNumber}`, selectedIssueNumber: selected.issueNumber, evidence: [...skippedEvidence, ...(result.evidence ?? [])], completedAt: now().toISOString() });
    report.write(eligibilityReportPath);
    return { ...result, eligibilityReportPath, evidence: [...(result.evidence ?? []), ...skippedEvidence] };
  } catch (error) {
    const evidence = [sanitizeText(error.message)];
    report.complete({ outcome: FORGE_RESULTS.RUNTIME_ERROR, message: 'Forge eligibility run failed', evidence, completedAt: now().toISOString() });
    try { report.write(eligibilityReportPath); } catch (reportError) { evidence.push(`eligibility report write failed: ${sanitizeText(reportError.message)}`); }
    return { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, message: 'Forge eligibility run failed', eligibilityReportPath, evidence };
  } finally {
    releaseForgeLock({ lockPath, lock: schedulerLock.lock });
  }
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
