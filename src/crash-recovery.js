#!/usr/bin/env node
/**
 * crash-recovery.js — Crash recovery and stale task reconciliation
 *
 * On startup (or on demand), this module inspects all local runtime state
 * sources (heartbeat, claim lock, supervisor lock, .hermes/state.json),
 * cross-references with GitHub issue state and existing reports, and
 * produces a machine-readable recovery outcome.
 *
 * It never silently resumes code changes after an ambiguous crash.
 * Stale local runtime artifacts are cleared only when stale evidence
 * is explicit and documented.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { hostname as getHostname } from 'node:os';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Paths — configurable for test injection
// ---------------------------------------------------------------------------

const DEFAULT_REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

function defaultPaths(root = DEFAULT_REPO_ROOT) {
  return {
    hermesDir: resolve(root, '.hermes'),
    runtimeDir: resolve(root, '.hermes', 'runtime'),
    heartbeatPath: resolve(root, '.hermes', 'runtime', 'heartbeat.json'),
    claimLockPath: resolve(root, '.hermes', 'claim.lock'),
    supervisorLockPath: resolve(root, '.hermes', 'supervisor.lock'),
    statePath: resolve(root, '.hermes', 'state.json'),
    reportsDir: resolve(root, 'REPORTS'),
    logsDir: resolve(root, 'LOGS'),
    recoveryEvidenceDir: resolve(root, '.hermes', 'recovery')
  };
}

// ---------------------------------------------------------------------------
// Outcome constants
// ---------------------------------------------------------------------------

export const RECONCILE_OUTCOMES = Object.freeze({
  /** Clean state — nothing needed recovery */
  NO_ACTION: 'NO_ACTION',
  /** Stale state was detected and successfully cleaned up */
  RECOVERED: 'RECOVERED',
  /** Task was in progress and can be safely resumed (rare, conservative) */
  RESUME_REQUIRED: 'RESUME_REQUIRED',
  /** Ambiguous state — human must review and decide */
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  /** Unexpected error during reconciliation */
  RUNTIME_ERROR: 'RUNTIME_ERROR'
});

// ---------------------------------------------------------------------------
// Label constants
// ---------------------------------------------------------------------------

const LABEL_HERMES_READY = 'hermes:ready';
const LABEL_HERMES_WORKING = 'hermes:working';
const LABEL_HERMES_DONE = 'hermes:done';
const LABEL_HERMES_BLOCKED = 'hermes:blocked';
const LABEL_PM_READY = 'pm:ready';
const LABEL_PM_REVIEW = 'pm:review';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function safeReadJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function isPidAlive(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }
  try {
    process.kill(numericPid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    return true;
  }
}

/**
 * Extract EAI-TASK identifier from an issue title or null if not present.
 */
function taskToken(title) {
  const match = String(title ?? '').match(/EAI-TASK-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Check if a report exists for the given task token or issue number.
 */
function matchingReportExists({ taskId, issueNumber, reportsDir }) {
  if (!existsSync(reportsDir)) {
    return false;
  }
  const files = readdirSync(reportsDir);
  const tokenUpper = (taskId ?? '').toUpperCase();
  const issuePadded = issueNumber ? `EAI-TASK-${String(issueNumber).padStart(3, '0')}` : null;
  return files.some((name) => {
    const upper = name.toUpperCase();
    if (tokenUpper && upper.startsWith(tokenUpper)) return true;
    if (issuePadded && upper.startsWith(issuePadded)) return true;
    if (issueNumber && upper.startsWith(`TASK-${issueNumber}`)) return true;
    return false;
  });
}

/**
 * Append a line to the recovery evidence log.
 */
function appendRecoveryEvidence(recoveryDir, line, now = () => new Date()) {
  ensureDir(recoveryDir);
  const evidencePath = resolve(recoveryDir, 'recovery-evidence.log');
  const timestamp = nowIso(now);
  try {
    writeFileSync(evidencePath, `[${timestamp}] ${line}\n`, { flag: 'as' });
  } catch {
    // If we cannot write evidence, the reconciliation itself may have an issue;
    // but we should not throw — the outcome is still valid.
  }
}

/**
 * Try to remove a file. Returns true if removed, false if not present or failed.
 */
function tryRemove(path) {
  if (!existsSync(path)) {
    return false;
  }
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GitHub helper — runs via spawnSync unless overridden by injected ghRunner
// ---------------------------------------------------------------------------

function makeGhRunner(repoRoot) {
  return (args) => {
    const result = spawnSync('gh', args, { cwd: repoRoot, encoding: 'utf8', timeout: 30000 });
    if (result.error) {
      throw new Error(`gh ${args.join(' ')} failed: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || `gh ${args.join(' ')} failed with status ${result.status}`);
    }
    return result.stdout.trim();
  };
}

function normalizeLabels(issue) {
  return (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function ghViewIssue(issueNumber, gh) {
  const raw = gh([
    'issue', 'view', String(issueNumber),
    '--repo', 'moh0709/everythingAI',
    '--json', 'number,title,state,labels,url'
  ]);
  return JSON.parse(raw);
}

function ghEditLabels(issueNumber, addLabels, removeLabels, gh) {
  const args = ['issue', 'edit', String(issueNumber), '--repo', 'moh0709/everythingAI'];
  if (addLabels.length > 0) {
    args.push('--add-label', addLabels.join(','));
  }
  if (removeLabels.length > 0) {
    args.push('--remove-label', removeLabels.join(','));
  }
  return gh(args);
}

/**
 * Attempt to correct GitHub labels and verify the change took effect.
 * Returns { success: true, actions, evidence } on success, or
 * { success: false, actions, evidence } on verification failure.
 */
function correctLabelsWithVerification({ issueNumber, addLabels, removeLabels, gh, actions, record }) {
  let postEditLabels;
  try {
    ghEditLabels(issueNumber, addLabels, removeLabels, gh);
    record('label edit command succeeded — re-reading to verify');

    // Re-read the issue to verify labels actually changed
    const verifiedIssue = ghViewIssue(issueNumber, gh);
    postEditLabels = normalizeLabels(verifiedIssue);

    const allAddedPresent = addLabels.every((l) => postEditLabels.includes(l));
    const anyRemovePresent = removeLabels.some((l) => postEditLabels.includes(l));

    if (allAddedPresent && !anyRemovePresent) {
      actions.push(`corrected GitHub labels: added ${addLabels.join(', ')}, removed ${removeLabels.join(', ')}`);
      record('label correction verified: expected labels are present and removed labels are absent');
      return { success: true, postEditLabels };
    }

    // Verification failed — labels did not change as expected
    const failureDetail = `label verification failed: added=${JSON.stringify(addLabels)} present=${JSON.stringify(addLabels.filter((l) => postEditLabels.includes(l)))} removed=${JSON.stringify(removeLabels)} stillPresent=${JSON.stringify(removeLabels.filter((l) => postEditLabels.includes(l)))}`;
    record(failureDetail);
    actions.push(failureDetail);
    return { success: false, postEditLabels };
  } catch (error) {
    const msg = `label correction or verification failed: ${error.message}`;
    actions.push(msg);
    record(msg);
    return { success: false, postEditLabels };
  }
}

// ---------------------------------------------------------------------------
// Reconciliation engine
// ---------------------------------------------------------------------------

/**
 * Perform crash recovery and stale task reconciliation.
 *
 * Reads all local state sources, cross-references with GitHub, and produces
 * a machine-readable outcome with evidence.
 *
 * @param {Object} options
 * @param {string} [options.repoRoot] - Repository root path (default: auto-detected)
 * @param {Function} [options.now] - Clock function for deterministic testing
 * @param {string} [options.hostname] - Hostname (default: os.hostname())
 * @param {number} [options.pid] - Current PID (default: process.pid)
 * @param {Function} [options.ghRunner] - Custom gh runner (for test injection)
 * @returns {Object} { outcome, outcomeCode, evidence, issueNumber, taskId, actions }
 */
export async function reconcile({
  repoRoot: root,
  now = () => new Date(),
  hostname = getHostname(),
  pid = process.pid,
  ghRunner
} = {}) {
  const paths = defaultPaths(root);
  const gh = ghRunner || makeGhRunner(root || DEFAULT_REPO_ROOT);

  // Track evidence and actions
  const evidence = [];
  const actions = [];
  const recoveryDir = paths.recoveryEvidenceDir;

  function record(msg) {
    evidence.push(msg);
    appendRecoveryEvidence(recoveryDir, msg, now);
  }

  // -----------------------------------------------------------------------
  // Step 1: Read all local state sources
  // -----------------------------------------------------------------------

  const heartbeat = safeReadJson(paths.heartbeatPath);
  const claimLock = safeReadJson(paths.claimLockPath);
  const supervisorLock = safeReadJson(paths.supervisorLockPath);
  const state = safeReadJson(paths.statePath);

  if (heartbeat) record(`heartbeat: present, pid=${heartbeat.pid}, lastResult=${heartbeat.lastResult ?? '(none)'}`);
  else record('heartbeat: absent');

  if (claimLock) record(`claimLock: present, issueNumber=${claimLock.issueNumber ?? '?'}, taskId=${claimLock.taskId ?? '?'}, pid=${claimLock.pid ?? '?'}, hostname=${claimLock.hostname ?? '?'}`);
  else record('claimLock: absent');

  if (supervisorLock) record(`supervisorLock: present, pid=${supervisorLock.pid ?? '?'}, hostname=${supervisorLock.hostname ?? '?'}`);
  else record('supervisorLock: absent');

  if (state) record(`state: currentIssue=${state.currentIssue ?? '(none)'}, currentTask=${state.currentTask ?? '(none)'}, result=${state.result ?? '(none)'}`);
  else record('state: absent');

  // -----------------------------------------------------------------------
  // Step 2: Determine host relationships
  // -----------------------------------------------------------------------

  const hbSameHost = heartbeat?.hostname ? heartbeat.hostname === hostname : null;
  const claimSameHost = claimLock?.hostname ? claimLock.hostname === hostname : null;
  const supervisorSameHost = supervisorLock?.hostname ? supervisorLock.hostname === hostname : null;

  // -----------------------------------------------------------------------
  // Step 3: UNCONDITIONAL CROSS-HOST ESCALATION
  // -----------------------------------------------------------------------
  // Any artifact from a different host cannot be verified locally.
  // Never infer remote-process liveness from a local PID lookup.
  // Escalate immediately without checking PID.

  if (claimLock && claimSameHost === false) {
    record(`claim lock from different host (${claimLock.hostname}) cannot be verified locally — escalating to manual review`);
    record('cross-host locks must be reviewed by a human; never clear remote locks automatically');
    return {
      outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
      outcomeCode: 'CROSS_HOST_LOCK',
      evidence,
      issueNumber: claimLock.issueNumber ?? null,
      taskId: claimLock.taskId ?? null,
      actions: []
    };
  }

  if (supervisorLock && supervisorSameHost === false) {
    record(`supervisor lock from different host (${supervisorLock.hostname}) cannot be verified locally — escalating to manual review`);
    record('cross-host locks must be reviewed by a human; never clear remote locks automatically');
    return {
      outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
      outcomeCode: 'CROSS_HOST_SUPERVISOR_LOCK',
      evidence,
      issueNumber: null,
      taskId: null,
      actions: []
    };
  }

  if (heartbeat && hbSameHost === false) {
    record(`heartbeat from different host (${heartbeat.hostname}) cannot be verified locally — escalating to manual review`);
    record('cross-host heartbeats must be reviewed by a human; never infer remote process liveness from local PID');
    return {
      outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
      outcomeCode: 'CROSS_HOST_HEARTBEAT',
      evidence,
      issueNumber: null,
      taskId: null,
      actions: []
    };
  }

  // -----------------------------------------------------------------------
  // Step 4: Assess liveness of each artifact (now safe — all are same-host)
  // -----------------------------------------------------------------------

  const hbPidAlive = heartbeat && isPidAlive(heartbeat.pid);
  const claimPidAlive = claimLock && isPidAlive(claimLock.pid);
  const supervisorPidAlive = supervisorLock && isPidAlive(supervisorLock.pid);

  // Heartbeat stale checks
  const hbStale = heartbeat ? (() => {
    if (!heartbeat.lastHeartbeat) return true;
    const lastHb = Date.parse(heartbeat.lastHeartbeat);
    if (!Number.isFinite(lastHb)) return true;
    const ageMs = now().getTime() - lastHb;
    return ageMs > 300_000; // 5 minutes default stale threshold for recovery
  })() : true;

  const hbIntentionallyStopped = heartbeat && (
    heartbeat.lastResult === 'SHUTDOWN' || heartbeat.lastResult === 'STOPPED'
  );

  // -----------------------------------------------------------------------
  // Step 5: Determine the "current work context" from available sources
  // -----------------------------------------------------------------------

  const contextIssueNumber = claimLock?.issueNumber ?? state?.currentIssue ?? null;
  const contextTaskId = claimLock?.taskId ?? state?.currentTask ?? null;
  const stateInProgress = state?.result === 'IN_PROGRESS';

  // -----------------------------------------------------------------------
  // Step 6: Evaluate scenarios
  // -----------------------------------------------------------------------

  // SCENARIO: Process heartbeat is still alive on same host → do not interfere
  if (heartbeat && hbPidAlive && hbSameHost) {
    record('active heartbeat: runtime process is still running on this host — no recovery action');
    return {
      outcome: RECONCILE_OUTCOMES.NO_ACTION,
      outcomeCode: 'PROCESS_ALIVE',
      evidence,
      issueNumber: contextIssueNumber,
      taskId: contextTaskId,
      actions: []
    };
  }

  // SCENARIO: Claim lock holder is still alive on same host → do not interfere
  if (claimLock && claimPidAlive && claimSameHost) {
    record('active claim lock: claim owner process is still running on this host — no recovery action');
    return {
      outcome: RECONCILE_OUTCOMES.NO_ACTION,
      outcomeCode: 'CLAIM_OWNER_ALIVE',
      evidence,
      issueNumber: contextIssueNumber,
      taskId: contextTaskId,
      actions: []
    };
  }

  // SCENARIO: Supervisor lock holder is still alive on same host → do not interfere
  if (supervisorLock && supervisorPidAlive && supervisorSameHost) {
    record('active supervisor lock: supervisor process is still running on this host — no recovery action');
    return {
      outcome: RECONCILE_OUTCOMES.NO_ACTION,
      outcomeCode: 'SUPERVISOR_ALIVE',
      evidence,
      issueNumber: contextIssueNumber,
      taskId: contextTaskId,
      actions: []
    };
  }

  // SCENARIO: Intentional shutdown — clean state
  if (hbIntentionallyStopped && !claimLock && !stateInProgress) {
    record('intentional shutdown detected (lastResult=SHUTDOWN or STOPPED), no claim lock, no IN_PROGRESS state');
    if (heartbeat) {
      if (tryRemove(paths.heartbeatPath)) {
        actions.push('removed stale heartbeat from intentional shutdown');
        record('removed heartbeat (intentional shutdown)');
      }
    }
    return {
      outcome: RECONCILE_OUTCOMES.NO_ACTION,
      outcomeCode: 'INTENTIONAL_SHUTDOWN',
      evidence,
      issueNumber: null,
      taskId: null,
      actions
    };
  }

  // SCENARIO: All clean — nothing to recover
  if (!heartbeat && !claimLock && !supervisorLock && !stateInProgress) {
    record('all state sources clean or absent — no recovery needed');
    return {
      outcome: RECONCILE_OUTCOMES.NO_ACTION,
      outcomeCode: 'ALL_CLEAN',
      evidence,
      issueNumber: null,
      taskId: null,
      actions: []
    };
  }

  // SCENARIO: Stale heartbeat + stale claim lock (both from dead PID on same host)
  if (heartbeat && hbStale && (!hbSameHost || !hbPidAlive) && claimLock && (!claimSameHost || !claimPidAlive)) {
    return handleStaleHeartbeatAndLock({
      heartbeat, claimLock, supervisorLock,
      paths, contextIssueNumber, contextTaskId,
      stateInProgress, state, gh,
      actions, record, evidence, recoveryDir
    });
  }

  // SCENARIO: Stale heartbeat (no claim lock)
  if (heartbeat && hbStale && (!hbSameHost || !hbPidAlive) && !claimLock) {
    record('stale heartbeat without claim lock');

    if (tryRemove(paths.heartbeatPath)) {
      actions.push('removed stale heartbeat');
      record('removed stale heartbeat');
    }

    if (stateInProgress) {
      record('state is IN_PROGRESS but no claim lock present — ambiguous');
      return {
        outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
        outcomeCode: 'IN_PROGRESS_WITHOUT_LOCK',
        evidence,
        issueNumber: contextIssueNumber,
        taskId: contextTaskId,
        actions
      };
    }

    return {
      outcome: RECONCILE_OUTCOMES.RECOVERED,
      outcomeCode: 'STALE_HEARTBEAT_CLEANED',
      evidence,
      issueNumber: null,
      taskId: null,
      actions
    };
  }

  // SCENARIO: Stale claim lock (no alive heartbeat or heartbeat absent)
  if (claimLock && (!claimSameHost || !claimPidAlive)) {
    return handleStaleClaimLock({
      claimLock, supervisorLock,
      paths, contextIssueNumber, contextTaskId,
      stateInProgress, gh,
      actions, record, evidence, recoveryDir
    });
  }

  // SCENARIO: State is IN_PROGRESS but no claim lock and no heartbeat
  if (stateInProgress && !claimLock && !heartbeat) {
    record('IN_PROGRESS state without claim lock or heartbeat — ambiguous');
    return {
      outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
      outcomeCode: 'IN_PROGRESS_ALONE',
      evidence,
      issueNumber: contextIssueNumber,
      taskId: contextTaskId,
      actions: []
    };
  }

  // Fallback: unmatched scenario
  record('unrecognized state combination — escalating for manual review');
  return {
    outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
    outcomeCode: 'UNRECOGNIZED_STATE',
    evidence,
    issueNumber: contextIssueNumber,
    taskId: contextTaskId,
    actions: []
  };
}

// ---------------------------------------------------------------------------
// Scenario handlers
// ---------------------------------------------------------------------------

/**
 * Handle the scenario where both heartbeat and claim lock are stale
 * (owner process is dead on the same host).
 */
function handleStaleHeartbeatAndLock({
  heartbeat, claimLock, supervisorLock,
  paths, contextIssueNumber, contextTaskId,
  stateInProgress, state, gh,
  actions, record, evidence
}) {
  // Check GitHub for the claimed issue
  if (contextIssueNumber) {
    try {
      const liveIssue = ghViewIssue(contextIssueNumber, gh);
      const liveLabels = normalizeLabels(liveIssue);
      const issueOpen = String(liveIssue?.state ?? '').toUpperCase() === 'OPEN';

      if (liveLabels.includes(LABEL_HERMES_DONE)) {
        // Task was completed on GitHub — update local state to match
        record(`issue #${contextIssueNumber} already has ${LABEL_HERMES_DONE} — task was completed elsewhere`);
        cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record });
        return {
          outcome: RECONCILE_OUTCOMES.RECOVERED,
          outcomeCode: 'COMPLETED_ELSEWHERE',
          evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
        };
      }

      if (stateInProgress && !issueOpen) {
        // Issue closed but state is IN_PROGRESS — likely completed
        record(`issue #${contextIssueNumber} is closed (state=${liveIssue.state}) but state shows IN_PROGRESS`);
        cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record });
        return {
          outcome: RECONCILE_OUTCOMES.RECOVERED,
          outcomeCode: 'ISSUE_CLOSED_STALE_STATE',
          evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
        };
      }

      // Check if a matching report exists
      const reportExists = matchingReportExists({
        taskId: contextTaskId,
        issueNumber: contextIssueNumber,
        reportsDir: paths.reportsDir
      });

      if (reportExists) {
        record(`matching report exists for ${contextTaskId ?? '#' + contextIssueNumber} — task completed before crash`);
        cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record });

        // Correct GitHub labels if still showing hermes:working, with verification
        if (liveLabels.includes(LABEL_HERMES_WORKING)) {
          const verifyResult = correctLabelsWithVerification({
            issueNumber: contextIssueNumber,
            addLabels: [LABEL_PM_REVIEW, LABEL_HERMES_DONE],
            removeLabels: [LABEL_HERMES_WORKING],
            gh, actions, record
          });

          if (!verifyResult.success) {
            // Label correction failed verification — escalate
            record('label correction verification failed — escalating for manual review');
            return {
              outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
              outcomeCode: 'LABEL_VERIFICATION_FAILED',
              evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
            };
          }
        }

        return {
          outcome: RECONCILE_OUTCOMES.RECOVERED,
          outcomeCode: 'REPORT_EXISTS_STALE_ARTIFACTS',
          evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
        };
      }

      // No report and state is not IN_PROGRESS — clean up stale artifacts
      if (!stateInProgress) {
        record('stale artifacts present but state is not IN_PROGRESS — cleaning up');
        cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record });
        return {
          outcome: RECONCILE_OUTCOMES.RECOVERED,
          outcomeCode: 'STALE_ARTIFACTS_CLEANED',
          evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
        };
      }

      // State is IN_PROGRESS, no matching report, issue still open,
      // stale artifacts present — ambiguous crash
      record('AMBIGUOUS: stale heartbeat + stale claim lock + IN_PROGRESS state + no matching report');
      record('Cannot safely resume — escalating for manual review');
      // Do NOT clear artifacts — preserve them for investigation
      return {
        outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
        outcomeCode: 'AMBIGUOUS_CRASH_NO_REPORT',
        evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions: []
      };
    } catch (error) {
      record(`GitHub lookup failed: ${error.message}`);
      // GitHub unavailable — cannot revalidate. Do not modify anything.
      return {
        outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
        outcomeCode: 'GITHUB_UNAVAILABLE',
        evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions: []
      };
    }
  }

  // No context issue number — stale artifacts but no known task
  record('stale heartbeat + stale claim lock but no context issue — cleaning up');
  cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record });
  return {
    outcome: RECONCILE_OUTCOMES.RECOVERED,
    outcomeCode: 'STALE_ARTIFACTS_CLEANED',
    evidence, issueNumber: null, taskId: null, actions
  };
}

/**
 * Handle the scenario where a stale claim lock exists but heartbeat is absent
 * or not a factor (already handled above).
 */
function handleStaleClaimLock({
  claimLock, supervisorLock,
  paths, contextIssueNumber, contextTaskId,
  stateInProgress, gh,
  actions, record, evidence
}) {
  const reportExists = matchingReportExists({
    taskId: contextTaskId,
    issueNumber: contextIssueNumber,
    reportsDir: paths.reportsDir
  });

  if (reportExists) {
    record(`stale claim lock with matching report — task completed, cleaning lock`);
    if (tryRemove(paths.claimLockPath)) {
      actions.push('removed stale claim lock');
      record('removed stale claim lock');
    }

    if (contextIssueNumber) {
      try {
        const liveIssue = ghViewIssue(contextIssueNumber, gh);
        const liveLabels = normalizeLabels(liveIssue);
        if (liveLabels.includes(LABEL_HERMES_WORKING)) {
          // Correct labels with verification
          const verifyResult = correctLabelsWithVerification({
            issueNumber: contextIssueNumber,
            addLabels: [LABEL_PM_REVIEW, LABEL_HERMES_DONE],
            removeLabels: [LABEL_HERMES_WORKING],
            gh, actions, record
          });

          if (!verifyResult.success) {
            record('label correction verification failed — escalating for manual review');
            return {
              outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
              outcomeCode: 'LABEL_VERIFICATION_FAILED',
              evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
            };
          }
        }
      } catch (error) {
        record(`GitHub label correction failed: ${error.message}`);
        return {
          outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
          outcomeCode: 'GITHUB_UNAVAILABLE',
          evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
        };
      }
    }

    return {
      outcome: RECONCILE_OUTCOMES.RECOVERED,
      outcomeCode: 'STALE_LOCK_WITH_REPORT',
      evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
    };
  }

  if (stateInProgress) {
    record('stale claim lock with IN_PROGRESS state — escalating for manual review');
    return {
      outcome: RECONCILE_OUTCOMES.MANUAL_REVIEW_REQUIRED,
      outcomeCode: 'STALE_LOCK_IN_PROGRESS',
      evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions: []
    };
  }

  // Lock exists but state is not IN_PROGRESS — safe to remove
  record('stale claim lock with no IN_PROGRESS state — removing lock');
  if (tryRemove(paths.claimLockPath)) {
    actions.push('removed stale claim lock');
    record('removed stale claim lock');
  }

  return {
    outcome: RECONCILE_OUTCOMES.RECOVERED,
    outcomeCode: 'STALE_LOCK_CLEANED',
    evidence, issueNumber: contextIssueNumber, taskId: contextTaskId, actions
  };
}

/**
 * Clean up stale runtime artifacts (claim lock, heartbeat, supervisor lock).
 * Only records actions for files that were actually removed.
 */
function cleanupStaleArtifacts({ claimLock, supervisorLock, paths, actions, record }) {
  if (claimLock) {
    if (tryRemove(paths.claimLockPath)) {
      actions.push('removed stale claim lock');
      record('removed stale claim lock');
    }
  }
  if (tryRemove(paths.heartbeatPath)) {
    actions.push('removed stale heartbeat');
    record('removed stale heartbeat');
  }
  if (supervisorLock) {
    if (tryRemove(paths.supervisorLockPath)) {
      actions.push('removed stale supervisor lock');
      record('removed stale supervisor lock');
    }
  }
}

// ---------------------------------------------------------------------------
// One-shot CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(args = process.argv.slice(2)) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--repo-root' && args[i + 1]) {
      parsed.repoRoot = args[i + 1];
      i += 1;
    } else if (args[i] === '--dry-run') {
      parsed.dryRun = true;
    } else if (args[i] === '--json') {
      parsed.json = true;
    }
  }
  return parsed;
}

async function runCli() {
  const args = parseArgs();
  const root = args.repoRoot || DEFAULT_REPO_ROOT;

  if (args.dryRun) {
    const paths = defaultPaths(root);
    console.log(JSON.stringify({
      ok: true,
      result: 'DRY_RUN',
      repoRoot: root,
      paths: {
        hermesDir: paths.hermesDir,
        runtimeDir: paths.runtimeDir,
        heartbeatPath: paths.heartbeatPath,
        claimLockPath: paths.claimLockPath,
        supervisorLockPath: paths.supervisorLockPath,
        statePath: paths.statePath,
        reportsDir: paths.reportsDir,
        logsDir: paths.logsDir
      }
    }, null, 2));
    return;
  }

  try {
    const result = await reconcile({ repoRoot: root });
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[crash-recovery] Outcome: ${result.outcome} (${result.outcomeCode})`);
      if (result.issueNumber) {
        console.log(`[crash-recovery] Context: issue #${result.issueNumber}, task ${result.taskId ?? '(unknown)'}`);
      }
      if (result.actions.length > 0) {
        console.log(`[crash-recovery] Actions taken:`);
        for (const action of result.actions) {
          console.log(`  - ${action}`);
        }
      }
      if (result.evidence.length > 0) {
        console.log(`[crash-recovery] Evidence:`);
        for (const line of result.evidence) {
          console.log(`  ${line}`);
        }
      }
    }
    process.exitCode = result.outcome === RECONCILE_OUTCOMES.RUNTIME_ERROR ? 1 : 0;
  } catch (error) {
    console.error(`[crash-recovery] Reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
