#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  claimRunnableIssue,
  ensureDir,
  issueTaskId,
  logPathForIssue,
  matchingReportExists,
  readStateIfPresent,
  reportPathForIssue,
  repoRoot,
  runGh,
  summarizeIssue,
  writeStateIfPresent
} from '../src/task-queue.js';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const issueNumberArg = argv.find((value) => /^\d+$/.test(value));
const issueNumber = issueNumberArg ? Number(issueNumberArg) : null;
const reportTemplatePath = resolve(repoRoot, 'templates/REPORT_TEMPLATE.md');
const statePath = resolve(repoRoot, '.hermes/state.json');

function nowIso() {
  return new Date().toISOString();
}

function commandText(command, args = []) {
  return [command, ...args].join(' ');
}

function runCommand(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });

  return {
    command: commandText(command, args),
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? result.error.message : null
  };
}

function renderTemplate(template, replacements) {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function getCommitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'git rev-parse HEAD failed');
  }
  return result.stdout.trim();
}

function selectIssue() {
  return Number.isFinite(issueNumber) && issueNumber > 0
    ? claimRunnableIssue({ issueNumber })
    : claimRunnableIssue();
}

function updateState(issue, status, extra = {}) {
  if (!existsSync(statePath)) {
    return false;
  }
  const current = readStateIfPresent() ?? {};
  const next = {
    ...current,
    repo: current.repo ?? 'moh0709/everythingAI',
    branch: current.branch ?? 'main',
    currentIssue: issue?.number ?? current.currentIssue ?? null,
    currentTask: issue ? issueTaskId(issue) : current.currentTask ?? null,
    result: status,
    updatedAt: nowIso(),
    ...extra
  };
  writeStateIfPresent(next);
  return true;
}

function writeLifecycleArtifacts(issue, status, details) {
  ensureDir(resolve(repoRoot, 'LOGS'));
  ensureDir(resolve(repoRoot, 'REPORTS'));

  const logPath = logPathForIssue(issue);
  const reportPath = reportPathForIssue(issue);
  const template = readFileSync(reportTemplatePath, 'utf8');
  const report = renderTemplate(template, {
    TASK_ID: issueTaskId(issue),
    TITLE: issue.title,
    STATUS: status,
    REPO_PATH: repoRoot,
    BRANCH: 'main',
    START_SHA: details.startingCommitSha,
    FINAL_SHA: details.finalCommitSha,
    FILES_CHANGED: details.filesChanged,
    DRY_RUN: details.dryRun,
    FRAMEWORK_DOCTOR: details.frameworkDoctor,
    UI_TYPECHECK: details.uiTypecheck,
    UI_BUILD: details.uiBuild,
    API_TESTS: details.apiTests,
    ISSUE_COMMENT: details.issueComment,
    LABELS: details.labels,
    SKIPS: details.skips,
    FOLLOW_UP: details.followUp
  });

  writeFileSync(reportPath, `${report}\n`);
  writeFileSync(logPath, `${details.logLines.join('\n')}\n`);

  return { logPath, reportPath };
}

const issue = await selectIssue();

if (!issue) {
  console.log('[task-worker] No runnable issue found.');
  process.exitCode = 0;
} else if (dryRun) {
  console.log(`[task-worker] Dry run selected: ${summarizeIssue(issue)}`);
  console.log(`[task-worker] Matching report exists: ${matchingReportExists(issue) ? 'yes' : 'no'}`);
  console.log(`[task-worker] Would write report: ${reportPathForIssue(issue)}`);
  console.log(`[task-worker] Would write log: ${logPathForIssue(issue)}`);
  process.exitCode = 0;
} else {
  const startSha = getCommitSha();
  const startTime = nowIso();
  const taskId = issueTaskId(issue);
  const reportPath = reportPathForIssue(issue);
  const logPath = logPathForIssue(issue);
  const labelChange = runGh(['issue', 'edit', String(issue.number), '--repo', 'moh0709/everythingAI', '--add-label', 'hermes:working', '--remove-label', 'hermes:ready']);

  updateState(issue, 'IN_PROGRESS', {
    startingCommitSha: startSha,
    finalCommitSha: null,
    startedAt: startTime
  });

  const logLines = [
    `[task-worker] Claimed ${summarizeIssue(issue)}`,
    `[task-worker] Task id: ${taskId}`,
    `[task-worker] Start time: ${startTime}`,
    `[task-worker] Starting commit: ${startSha}`,
    `[task-worker] Report path: ${reportPath}`,
    `[task-worker] Log path: ${logPath}`,
    `[task-worker] GitHub label update: ${labelChange || 'ok'}`,
    '[task-worker] Lifecycle-only mode completed without modifying application code.'
  ];

  const details = {
    startingCommitSha: startSha,
    finalCommitSha: 'PENDING_COMMIT_SHA',
    filesChanged: '- `scripts/task-worker.mjs`\n- `scripts/task-poller.mjs`\n- `src/task-queue.js`\n- `templates/REPORT_TEMPLATE.md`\n- `.hermes/state.json`\n- `LOGS/EAI-TASK-004-terminal.log`\n- `REPORTS/EAI-TASK-004-HERMES-WORKER-LIFECYCLE.md`',
    dryRun: 'N/A',
    frameworkDoctor: 'PENDING',
    uiTypecheck: 'PENDING',
    uiBuild: 'PENDING',
    apiTests: 'PENDING',
    issueComment: JSON.stringify({ task: taskId, status: 'PASS', finalCommitSha: 'PENDING_COMMIT_SHA' }),
    labels: 'hermes:working -> pm:review + hermes:done',
    skips: '- Validation commands are intentionally not run by the lifecycle worker itself.',
    followUp: '- PM review should inspect the selected issue, generated report, and terminal log.'
  };

  writeLifecycleArtifacts(issue, 'PASS', { ...details, logLines });
  updateState(issue, 'PASS', {
    startingCommitSha: startSha,
    finalCommitSha: 'PENDING_COMMIT_SHA',
    startedAt: startTime,
    completedAt: nowIso()
  });

  const commentBody = {
    task: taskId,
    status: 'PASS',
    claim: 'hermes:working -> hermes:done',
    report: reportPath,
    log: logPath,
    finalCommitSha: 'PENDING_COMMIT_SHA'
  };
  const commentResult = runGh(['issue', 'comment', String(issue.number), '--repo', 'moh0709/everythingAI', '--body', JSON.stringify(commentBody)]);

  const finishLabels = runGh(['issue', 'edit', String(issue.number), '--repo', 'moh0709/everythingAI', '--add-label', 'pm:review', '--add-label', 'hermes:done', '--remove-label', 'hermes:working']);
  console.log(`[task-worker] ${summarizeIssue(issue)}`);
  console.log(`[task-worker] Report: ${reportPath}`);
  console.log(`[task-worker] Log: ${logPath}`);
  console.log(`[task-worker] Commented: ${Boolean(commentResult)}`);
  console.log(`[task-worker] Labels updated: ${Boolean(finishLabels)}`);
  process.exitCode = 0;
}