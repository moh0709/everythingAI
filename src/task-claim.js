import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname as getHostname } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ensureDir,
  issueTaskId,
  matchingReportExists,
  readStateIfPresent,
  reportPathForIssue,
  repoRoot,
  runGh,
  statePath,
  summarizeIssue,
  writeStateIfPresent
} from './task-queue.js';

const claimLockPath = resolve(repoRoot, '.hermes/claim.lock');
const DEFAULT_STALE_LOCK_MS = 15 * 60 * 1000;

export const CLAIM_RESULTS = Object.freeze({
  CLAIMED: 'CLAIMED',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  NOT_RUNNABLE: 'NOT_RUNNABLE',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  RUNTIME_ERROR: 'RUNTIME_ERROR'
});

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function asIssueNumber(issueOrNumber) {
  if (typeof issueOrNumber === 'number' && Number.isFinite(issueOrNumber)) {
    return issueOrNumber;
  }
  const parsed = Number(issueOrNumber?.number);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLabels(issue) {
  return (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function issueMatches(issue, issueNumber) {
  return Number(issue?.number) === Number(issueNumber);
}

function lockMetadata({ issue, pid = process.pid, hostname = getHostname(), now = () => new Date() }) {
  return {
    issueNumber: Number(issue?.number),
    taskId: issueTaskId(issue),
    pid,
    hostname,
    createdAt: nowIso(now)
  };
}

function safeReadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function lockPathForIssue() {
  return claimLockPath;
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

function inspectClaimLock({ lockPath = lockPathForIssue(), hostname = getHostname(), now = () => new Date(), staleAfterMs = DEFAULT_STALE_LOCK_MS } = {}) {
  if (!existsSync(lockPath)) {
    return { present: false, stale: false, lock: null };
  }

  let lock;
  try {
    lock = safeReadJson(lockPath);
  } catch (error) {
    return {
      present: true,
      stale: false,
      lock: null,
      reason: `invalid lock file: ${error.message}`
    };
  }

  const createdAtMs = Date.parse(lock?.createdAt ?? '');
  const ageMs = Number.isFinite(createdAtMs) ? Math.max(0, now().getTime() - createdAtMs) : null;
  const sameHost = lock?.hostname && lock.hostname === hostname;
  const processAlive = sameHost ? isPidAlive(lock?.pid) : false;

  if (sameHost && !processAlive) {
    return { present: true, stale: true, lock, ageMs, reason: 'owner process is not alive on the current host' };
  }

  if (sameHost && ageMs !== null && ageMs > staleAfterMs && !processAlive) {
    return { present: true, stale: true, lock, ageMs, reason: 'lock exceeded stale threshold and owner process is gone' };
  }

  return { present: true, stale: false, lock, ageMs, reason: 'active lock' };
}

function releaseClaimLock(lockPath, expectedLock) {
  if (!existsSync(lockPath)) {
    return false;
  }

  try {
    const current = safeReadJson(lockPath);
    const sameOwner = current?.pid === expectedLock?.pid && current?.hostname === expectedLock?.hostname;
    const sameIssue = current?.issueNumber === expectedLock?.issueNumber && current?.taskId === expectedLock?.taskId;
    if (sameOwner && sameIssue) {
      unlinkSync(lockPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function acquireClaimLock({ issue, lockPath = lockPathForIssue(), pid = process.pid, hostname = getHostname(), now = () => new Date(), staleAfterMs = DEFAULT_STALE_LOCK_MS } = {}) {
  ensureDir(resolve(repoRoot, '.hermes'));
  const metadata = lockMetadata({ issue, pid, hostname, now });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(lockPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
      return { ok: true, lock: metadata };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        return { ok: false, result: CLAIM_RESULTS.RUNTIME_ERROR, evidence: [`claim lock create failed: ${error.message}`] };
      }

      const inspected = inspectClaimLock({ lockPath, hostname, now, staleAfterMs });
      if (!inspected.present || !inspected.lock) {
        continue;
      }
      if (inspected.stale) {
        try {
          unlinkSync(lockPath);
          continue;
        } catch (removeError) {
          return {
            ok: false,
            result: CLAIM_RESULTS.CLAIM_CONFLICT,
            evidence: [`stale lock could not be removed: ${removeError.message}`]
          };
        }
      }

      return {
        ok: false,
        result: CLAIM_RESULTS.CLAIM_CONFLICT,
        evidence: [
          `active local claim lock present for issue #${inspected.lock.issueNumber ?? 'unknown'}`,
          inspected.reason ?? 'lock already exists'
        ]
      };
    }
  }

  return {
    ok: false,
    result: CLAIM_RESULTS.CLAIM_CONFLICT,
    evidence: ['unable to acquire claim lock after stale-lock recovery attempt']
  };
}

async function ghIssueView(issueNumber, ghRunner = runGh) {
  const raw = await Promise.resolve(ghRunner(['issue', 'view', String(issueNumber), '--repo', 'moh0709/everythingAI', '--json', 'number,title,state,labels,url,updatedAt,body']));
  return JSON.parse(raw);
}

async function ghIssueEdit(issueNumber, args = [], ghRunner = runGh) {
  return Promise.resolve(ghRunner(['issue', 'edit', String(issueNumber), '--repo', 'moh0709/everythingAI', ...args]));
}

async function ghIssueComment(issueNumber, body, ghRunner = runGh) {
  return Promise.resolve(ghRunner(['issue', 'comment', String(issueNumber), '--repo', 'moh0709/everythingAI', '--body', body]));
}

function stateConflictForIssue(currentState) {
  return Boolean(currentState && currentState.result === 'IN_PROGRESS');
}

async function assessClaimReadiness({
  issueNumber,
  issue = null,
  ghRunner = runGh,
  reportExists = matchingReportExists,
  stateReader = readStateIfPresent,
  lockInspector = inspectClaimLock,
  lockPath = lockPathForIssue(),
  hostname = getHostname(),
  now = () => new Date(),
  ownedLock = null
} = {}) {
  const targetIssueNumber = asIssueNumber(issue) ?? Number(issueNumber);
  if (!Number.isFinite(targetIssueNumber) || targetIssueNumber <= 0) {
    return {
      ok: false,
      result: CLAIM_RESULTS.NOT_RUNNABLE,
      evidence: ['missing or invalid issue number']
    };
  }

  let liveIssue = issue;
  if (!liveIssue) {
    try {
      liveIssue = await ghIssueView(targetIssueNumber, ghRunner);
    } catch (error) {
      return {
        ok: false,
        result: CLAIM_RESULTS.RUNTIME_ERROR,
        evidence: [`live issue lookup failed: ${error.message}`]
      };
    }
  }

  if (Number(liveIssue?.number) !== targetIssueNumber) {
    return {
      ok: false,
      result: CLAIM_RESULTS.NOT_RUNNABLE,
      evidence: [`issue #${targetIssueNumber} could not be resolved from live GitHub state`]
    };
  }

  if (String(liveIssue?.state ?? '').toUpperCase() !== 'OPEN') {
    return {
      ok: false,
      result: CLAIM_RESULTS.NOT_RUNNABLE,
      issue: liveIssue,
      evidence: [`issue state=${liveIssue?.state ?? 'unknown'}`]
    };
  }

  const labels = normalizeLabels(liveIssue);
  if (!labels.includes('pm:ready') || !labels.includes('hermes:ready')) {
    return {
      ok: false,
      result: CLAIM_RESULTS.NOT_RUNNABLE,
      issue: liveIssue,
      evidence: [`labels=${labels.join(', ') || '(none)'}`]
    };
  }

  if (labels.includes('hermes:working') || labels.includes('hermes:done')) {
    return {
      ok: false,
      result: CLAIM_RESULTS.NOT_RUNNABLE,
      issue: liveIssue,
      evidence: [`labels=${labels.join(', ')}`, 'issue already claimed or completed by Hermes']
    };
  }

  if (reportExists(liveIssue)) {
    return {
      ok: false,
      result: CLAIM_RESULTS.ALREADY_COMPLETED,
      issue: liveIssue,
      evidence: [`matching report exists at ${reportPathForIssue(liveIssue)}`]
    };
  }

  const currentState = stateReader();
  if (stateConflictForIssue(currentState)) {
    return {
      ok: false,
      result: CLAIM_RESULTS.CLAIM_CONFLICT,
      issue: liveIssue,
      evidence: [`state=currentIssue:${currentState.currentIssue}, result:${currentState.result}`]
    };
  }

  const lock = lockInspector({ lockPath, hostname, now });
  if (lock.present && !lock.stale) {
    const ownedByCaller = ownedLock
      && lock.lock?.pid === ownedLock.pid
      && lock.lock?.hostname === ownedLock.hostname
      && lock.lock?.issueNumber === ownedLock.issueNumber
      && lock.lock?.taskId === ownedLock.taskId;
    if (!ownedByCaller) {
      return {
        ok: false,
        result: CLAIM_RESULTS.CLAIM_CONFLICT,
        issue: liveIssue,
        evidence: [lock.reason ?? 'active local claim lock present']
      };
    }
  }

  return {
    ok: true,
    result: CLAIM_RESULTS.CLAIMED,
    issue: liveIssue,
    evidence: [
      `labels=${labels.join(', ')}`,
      currentState ? `state=currentIssue:${currentState.currentIssue}, result:${currentState.result}` : 'no local state file present',
      lock.present && lock.stale ? `stale lock ignored: ${lock.reason}` : 'no active local claim lock present'
    ]
  };
}

function buildClaimAckBody({ issue, taskId, startSha, claimedAt, labelMutation, lock }) {
  return JSON.stringify({
    task: taskId,
    status: 'CLAIMED',
    issue: issue.number,
    title: issue.title,
    claimedAt,
    startingCommitSha: startSha,
    labels: labelMutation,
    lock: {
      pid: lock.pid,
      hostname: lock.hostname,
      createdAt: lock.createdAt
    }
  });
}

export async function claimRunnableIssue({
  issueNumber,
  issue = null,
  ghRunner = runGh,
  reportExists = matchingReportExists,
  stateReader = readStateIfPresent,
  stateWriter = writeStateIfPresent,
  lockPath = lockPathForIssue(),
  hostname = getHostname(),
  pid = process.pid,
  now = () => new Date()
} = {}) {
  const readiness = await assessClaimReadiness({
    issueNumber,
    issue,
    ghRunner,
    reportExists,
    stateReader,
    lockPath,
    hostname,
    now
  });

  if (!readiness.ok) {
    return readiness;
  }

  const activeIssue = readiness.issue;
  const lockAttempt = acquireClaimLock({ issue: activeIssue, lockPath, pid, hostname, now });
  if (!lockAttempt.ok) {
    return lockAttempt;
  }

  const lock = lockAttempt.lock;
  let claimed = false;
  try {
    const liveIssue = await ghIssueView(activeIssue.number, ghRunner);
    const liveReadiness = await assessClaimReadiness({
      issueNumber: liveIssue.number,
      issue: liveIssue,
      ghRunner,
      reportExists,
      stateReader,
      lockPath,
      hostname,
      now,
      ownedLock: lock
    });

    if (!liveReadiness.ok) {
      return liveReadiness;
    }

    await ghIssueEdit(liveIssue.number, ['--add-label', 'hermes:working', '--remove-label', 'hermes:ready'], ghRunner);
    const verifiedIssue = await ghIssueView(liveIssue.number, ghRunner);
    const verifiedLabels = normalizeLabels(verifiedIssue);
    if (!verifiedLabels.includes('hermes:working') || verifiedLabels.includes('hermes:ready')) {
      return {
        ok: false,
        result: CLAIM_RESULTS.RUNTIME_ERROR,
        issue: verifiedIssue,
        evidence: [
          `label verification failed for ${summarizeIssue(verifiedIssue)}`,
          `labels=${verifiedLabels.join(', ') || '(none)'}`
        ]
      };
    }

    const currentState = stateReader();
    const claimedAt = nowIso(now);
    if (currentState || existsSync(statePath)) {
      stateWriter({
        ...(currentState ?? {}),
        repo: currentState?.repo ?? 'moh0709/everythingAI',
        branch: currentState?.branch ?? 'main',
        currentIssue: verifiedIssue.number,
        currentTask: issueTaskId(verifiedIssue),
        result: 'IN_PROGRESS',
        startedAt: claimedAt,
        updatedAt: claimedAt
      });
    }

    await ghIssueComment(
      verifiedIssue.number,
      buildClaimAckBody({
        issue: verifiedIssue,
        taskId: issueTaskId(verifiedIssue),
        startSha: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim(),
        claimedAt,
        labelMutation: 'hermes:ready -> hermes:working',
        lock
      }),
      ghRunner
    );

    claimed = true;
    return {
      ok: true,
      result: CLAIM_RESULTS.CLAIMED,
      issue: verifiedIssue,
      lock,
      releaseLock: () => releaseClaimLock(lockPath, lock),
      evidence: [
        `claimed ${summarizeIssue(verifiedIssue)}`,
        `lock=${lockPath}`
      ]
    };
  } catch (error) {
    return {
      ok: false,
      result: CLAIM_RESULTS.RUNTIME_ERROR,
      issue: activeIssue,
      evidence: [`claim failed: ${error.message}`]
    };
  } finally {
    if (!claimed) {
      releaseClaimLock(lockPath, lock);
    }
  }
}

export {
  acquireClaimLock,
  assessClaimReadiness,
  claimLockPath,
  inspectClaimLock,
  lockPathForIssue,
  releaseClaimLock
};
