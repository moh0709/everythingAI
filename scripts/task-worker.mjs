#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { detectRuntimeMode, RUNTIME_MODES } from '../src/runtime-mode.js';
import {
  ensureDir,
  issueTaskId,
  logPathForIssue,
  matchingReportExists,
  readStateIfPresent,
  reportPathForIssue,
  repoRoot,
  runGh,
  summarizeIssue,
  writeStateIfPresent,
  claimRunnableIssue as selectRunnableIssue
} from '../src/task-queue.js';
import {
  CLAIM_RESULTS,
  claimRunnableIssue as claimTaskOwnership
} from '../src/task-claim.js';

const argv = process.argv.slice(2);
const issueNumberArg = argv.find((value) => /^\d+$/.test(value));
const issueNumber = issueNumberArg ? Number(issueNumberArg) : null;
const reportTemplatePath = resolve(repoRoot, 'templates/REPORT_TEMPLATE.md');
const statePath = resolve(repoRoot, '.hermes/state.json');
const PRE_COMMIT_ARTIFACT_SHA = 'PENDING_COMMIT_SHA';
const ARTIFACT_SHA_SOURCE_OF_TRUTH = 'GitHub issue comment after artifact push records the final artifact commit SHA';
const FINAL_SHA_SOURCE_OF_TRUTH = 'GitHub issue comment after artifact push';
const TWO_STEP_FINALIZATION_PATTERN = 'Two-step post-commit finalization: artifact files are written first, the artifact commit is created outside the worker lifecycle step, and the final GitHub issue comment records the pushed artifact commit SHA as the source of truth.';

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

function selectIssue(selectedIssueNumber = issueNumber) {
  return Number.isFinite(selectedIssueNumber) && selectedIssueNumber > 0
    ? selectRunnableIssue({ issueNumber: selectedIssueNumber })
    : selectRunnableIssue();
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
    PRE_COMMIT_ARTIFACT_SHA: details.preCommitArtifactSha,
    ARTIFACT_SHA: details.artifactCommitSha,
    FINAL_SHA_SOURCE: details.finalShaSource,
    FILES_CHANGED: details.filesChanged,
    DRY_RUN: details.dryRun,
    FRAMEWORK_DOCTOR: details.frameworkDoctor,
    UI_TYPECHECK: details.uiTypecheck,
    UI_BUILD: details.uiBuild,
    API_TESTS: details.apiTests,
    ISSUE_COMMENT: details.issueComment,
    LABELS: details.labels,
    FINAL_SHA_HANDLING: details.finalShaHandling,
    SKIPS: details.skips,
    FOLLOW_UP: details.followUp
  });

  writeFileSync(reportPath, `${report}\n`);
  writeFileSync(logPath, `${details.logLines.join('\n')}\n`);

  return { logPath, reportPath };
}

export async function executeClaimedTask({
  issue,
  claim,
  ghRunner = runGh,
  stateReader = readStateIfPresent,
  stateWriter = updateState,
  artifactWriter = writeLifecycleArtifacts
} = {}) {
  if (!issue) {
    throw new Error('executeClaimedTask requires an issue');
  }

  const claimedIssue = issue;
  const releaseClaimLock = claim?.releaseLock;
  try {
    const startSha = getCommitSha();
    const startTime = nowIso();
    const taskId = issueTaskId(claimedIssue);
    const reportPath = reportPathForIssue(claimedIssue);
    const logPath = logPathForIssue(claimedIssue);
    const currentState = stateReader();

    const logLines = [
      `[task-worker] Claimed ${summarizeIssue(claimedIssue)}`,
      `[task-worker] Task id: ${taskId}`,
      `[task-worker] Start time: ${startTime}`,
      `[task-worker] Starting commit: ${startSha}`,
      `[task-worker] Report path: ${reportPath}`,
      `[task-worker] Log path: ${logPath}`,
      currentState
        ? `[task-worker] State before execution: currentIssue=${currentState.currentIssue ?? 'none'}, result=${currentState.result ?? 'unknown'}`
        : '[task-worker] State before execution: no local state file present',
      '[task-worker] Claim authority verified labels and posted the claim acknowledgement.',
      '[task-worker] Lifecycle-only mode completed without modifying application code.'
    ];

    const details = {
      startingCommitSha: startSha,
      preCommitArtifactSha: PRE_COMMIT_ARTIFACT_SHA,
      artifactCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH,
      finalShaSource: FINAL_SHA_SOURCE_OF_TRUTH,
      finalShaHandling: TWO_STEP_FINALIZATION_PATTERN,
      filesChanged: '- `scripts/task-worker.mjs`\n- `scripts/task-poller.mjs`\n- `src/task-queue.js`\n- `src/task-claim.js`\n- `templates/REPORT_TEMPLATE.md`\n- `.hermes/state.json`\n- `LOGS/EAI-TASK-004-terminal.log`\n- `REPORTS/EAI-TASK-004-HERMES-WORKER-LIFECYCLE.md`',
      dryRun: 'N/A',
      frameworkDoctor: 'PENDING',
      uiTypecheck: 'PENDING',
      uiBuild: 'PENDING',
      apiTests: 'PENDING',
      issueComment: JSON.stringify({ task: taskId, status: 'PASS', artifactCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH, finalShaSource: FINAL_SHA_SOURCE_OF_TRUTH }),
      labels: 'hermes:working -> pm:review + hermes:done',
      skips: '- Validation commands are intentionally not run by the lifecycle worker itself.',
      followUp: '- PM review should inspect the selected issue, generated report, and terminal log.'
    };

    artifactWriter(claimedIssue, 'PASS', { ...details, logLines });
    stateWriter(claimedIssue, 'PASS', {
      startingCommitSha: startSha,
      artifactCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH,
      finalCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH,
      finalShaSource: FINAL_SHA_SOURCE_OF_TRUTH,
      finalizationPattern: TWO_STEP_FINALIZATION_PATTERN,
      startedAt: startTime,
      completedAt: nowIso()
    });

    const commentBody = {
      task: taskId,
      status: 'PASS',
      claim: 'hermes:working -> hermes:done',
      report: reportPath,
      log: logPath,
      artifactCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH,
      finalCommitSha: ARTIFACT_SHA_SOURCE_OF_TRUTH,
      finalShaSource: FINAL_SHA_SOURCE_OF_TRUTH,
      finalizationPattern: TWO_STEP_FINALIZATION_PATTERN
    };
    const commentResult = await Promise.resolve(
      ghRunner(['issue', 'comment', String(claimedIssue.number), '--repo', 'moh0709/everythingAI', '--body', JSON.stringify(commentBody)])
    );

    const finishLabels = await Promise.resolve(
      ghRunner(['issue', 'edit', String(claimedIssue.number), '--repo', 'moh0709/everythingAI', '--add-label', 'pm:review', '--add-label', 'hermes:done', '--remove-label', 'hermes:working'])
    );
    console.log(`[task-worker] ${summarizeIssue(claimedIssue)}`);
    console.log(`[task-worker] Report: ${reportPath}`);
    console.log(`[task-worker] Log: ${logPath}`);
    console.log(`[task-worker] Commented: ${Boolean(commentResult)}`);
    console.log(`[task-worker] Labels updated: ${Boolean(finishLabels)}`);
    process.exitCode = 0;
    return { issue: claimedIssue, reportPath, logPath, claim };
  } finally {
    releaseClaimLock?.();
  }
}

export async function runTaskWorker({
  runtimeDetector = detectRuntimeMode,
  env = process.env,
  argv = process.argv.slice(2),
  issueSelector = selectIssue,
  ghRunner = runGh,
  stateReader = readStateIfPresent,
  stateWriter = updateState,
  artifactWriter = writeLifecycleArtifacts
} = {}) {
  const runtime = runtimeDetector({ env, argv });
  if (runtime.mode !== RUNTIME_MODES.POLLING) {
    const result = {
      ok: false,
      result: 'UNKNOWN_RUNTIME_MODE',
      source: runtime.source,
      mode: runtime.mode,
      evidence: runtime.evidence,
      remediation: runtime.remediation
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  const dryRun = argv.includes('--dry-run');
  const issueNumberArg = argv.find((value) => /^\d+$/.test(value));
  const issueNumberFromArgs = issueNumberArg ? Number(issueNumberArg) : null;
  const issue = await issueSelector(issueNumberFromArgs);

  if (!issue) {
    console.log('[task-worker] No runnable issue found.');
    process.exitCode = 0;
    return null;
  }

  if (dryRun) {
    console.log(`[task-worker] Dry run selected: ${summarizeIssue(issue)}`);
    console.log(`[task-worker] Matching report exists: ${matchingReportExists(issue) ? 'yes' : 'no'}`);
    console.log(`[task-worker] Would write report: ${reportPathForIssue(issue)}`);
    console.log(`[task-worker] Would write log: ${logPathForIssue(issue)}`);
    process.exitCode = 0;
    return issue;
  }

  const claim = await claimTaskOwnership({ issueNumber: issue.number, issue, ghRunner, stateReader, stateWriter });
  if (!claim.ok || claim.result !== CLAIM_RESULTS.CLAIMED) {
    console.log(`[task-worker] Claim result for ${summarizeIssue(issue)}: ${claim.result}`);
    if (claim.evidence?.length) {
      for (const line of claim.evidence) {
        console.log(`[task-worker] ${line}`);
      }
    }
    process.exitCode = claim.result === CLAIM_RESULTS.RUNTIME_ERROR ? 1 : 0;
    return claim;
  }

  return executeClaimedTask({
    issue: claim.issue ?? issue,
    claim,
    ghRunner,
    stateReader,
    stateWriter,
    artifactWriter
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runTaskWorker();
  if (result && result.ok === false && result.result === CLAIM_RESULTS.RUNTIME_ERROR) {
    process.exitCode = 1;
  }
}
