import { existsSync, mkdirSync, openSync, readFileSync, closeSync, unlinkSync, renameSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';
import { isForgeEligibleForQueue, normalizeIssueLabels } from './agent-queue-policy.js';

export const FORGE_RESULTS = Object.freeze({
  CLAIMED: 'CLAIMED',
  IDLE: 'IDLE',
  IGNORED_INELIGIBLE: 'IGNORED_INELIGIBLE',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  REPORTING_REQUIRED: 'REPORTING_REQUIRED',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  HUMAN_START_REQUIRED: 'HUMAN_START_REQUIRED',
  AUTONOMOUS_STARTED: 'AUTONOMOUS_STARTED',
  AUTONOMOUS_BLOCKED: 'AUTONOMOUS_BLOCKED'
});

export function normalizeLabels(issue) {
  return normalizeIssueLabels(issue);
}

export function isForgeEligible(issue) {
  return isForgeEligibleForQueue(issue);
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  renameSync(temp, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function pidAlive(pid, processChecker = (value) => {
  try { process.kill(Number(value), 0); return true; } catch (error) { return error?.code !== 'ESRCH'; }
}) {
  return Number.isInteger(Number(pid)) && Number(pid) > 0 && processChecker(pid);
}

export function acquireForgeLock({ lockPath, issueNumber, pid = process.pid, host = hostname(), now = () => new Date(), staleAfterMs = 15 * 60 * 1000, processChecker } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const lock = { issueNumber: Number(issueNumber), pid, hostname: host, createdAt: now().toISOString() };
  try {
    const fd = openSync(lockPath, 'wx');
    writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`);
    closeSync(fd);
    return { ok: true, lock };
  } catch (error) {
    if (error?.code !== 'EEXIST') return { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, evidence: [`lock create failed: ${error.message}`] };
    let current;
    try { current = readJson(lockPath); } catch (readError) {
      return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, evidence: [`lock unreadable: ${readError.message}`] };
    }
    const sameHost = current.hostname === host;
    const ageMs = Date.parse(current.createdAt) ? Math.max(0, now().getTime() - Date.parse(current.createdAt)) : null;
    if (!sameHost) return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, evidence: ['cross-host lock requires manual review'] };
    if (pidAlive(current.pid, processChecker) || ageMs === null || ageMs <= staleAfterMs) {
      return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, evidence: [`active local lock for issue #${current.issueNumber}`] };
    }
    try { unlinkSync(lockPath); } catch (removeError) {
      return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, evidence: [`stale lock removal failed: ${removeError.message}`] };
    }
    return acquireForgeLock({ lockPath, issueNumber, pid, host, now, staleAfterMs, processChecker });
  }
}

export function releaseForgeLock({ lockPath, lock }) {
  if (!existsSync(lockPath)) return false;
  try {
    const current = readJson(lockPath);
    if (current.pid !== lock.pid || current.hostname !== lock.hostname || current.issueNumber !== lock.issueNumber) return false;
    unlinkSync(lockPath);
    return true;
  } catch { return false; }
}

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/(?:gh[pousr]_|github_pat_|xox[baprs]-|sk-[A-Za-z0-9_-]{10,}|\d{8,12}:[A-Za-z0-9_-]{20,})[A-Za-z0-9._-]*/g, '[REDACTED]')
    .replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/(authorization\s*[:=]\s*bearer\s+|bot_token\s*[:=]\s*|token\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

function sanitizeValue(value, key = '') {
  if (/(?:authorization|bot.?token|password|private.?key|secret|token)/i.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)]));
  }
  return value;
}

export function sanitizeReport(report) {
  return sanitizeValue(report);
}

export function recordForgeTriggerHeartbeat({ heartbeatPath, result, now = () => new Date() } = {}) {
  const heartbeat = sanitizeReport({
    status: result?.ok ? 'HEALTHY' : 'DEGRADED',
    result: result?.result ?? FORGE_RESULTS.RUNTIME_ERROR,
    lastPollAt: now().toISOString(),
    evidence: result?.evidence ?? []
  });
  atomicWriteJson(heartbeatPath, heartbeat);
  return heartbeat;
}

export function prepareForgeContext({ issue, repoRoot, startingSha, projectState, bootstrap, contextPath, now = () => new Date() } = {}) {
  const target = contextPath ?? resolve(repoRoot, '.hermes/forge', `context-${issue.number}.json`);
  const context = {
    issue: { number: issue.number, title: issue.title, url: issue.url, state: issue.state, labels: normalizeLabels(issue), body: issue.body ?? '' },
    authoritativeContext: { projectState, bootstrap },
    startingSha,
    createdAt: now().toISOString(),
    automationBoundary: 'FULLY_AUTOMATIC_CODEX_CLI',
    nextAction: 'The trigger launches one bounded Codex CLI worker from this complete context.'
  };
  atomicWriteJson(target, sanitizeReport(context));
  return { path: target, context };
}

function defaultStatePath(repoRoot) { return resolve(repoRoot, '.hermes/forge/state.json'); }

export async function claimForgeIssue({ issue, fetchLiveIssue, updateLabels, postComment, lockPath, repoRoot = process.cwd(), statePath = defaultStatePath(repoRoot), startingSha = 'unknown', projectState = '', bootstrap = '', now = () => new Date(), pid = process.pid, host = hostname(), processChecker, reporter = async () => ({ sent: false, reason: 'not-configured' }), execute = null } = {}) {
  const targetNumber = Number(issue?.number);
  if (!Number.isFinite(targetNumber)) return { ok: false, result: FORGE_RESULTS.IGNORED_INELIGIBLE, evidence: ['missing issue number'] };
  const live = await fetchLiveIssue(targetNumber);
  const existingState = existsSync(statePath) ? readJson(statePath) : null;
  if (existingState?.issueNumber === targetNumber && existingState?.status === 'REPORTING_REQUIRED') {
    const recovered = await postComment(live, existingState.comment);
    if (!recovered?.ok) return { ok: false, result: FORGE_RESULTS.REPORTING_REQUIRED, issue: live, evidence: ['pending claim acknowledgement still requires delivery'] };
    atomicWriteJson(statePath, { ...existingState, status: 'CLAIMED', claimCommentPosted: true, recoveredAt: now().toISOString() });
    return { ok: true, result: FORGE_RESULTS.CLAIMED, issue: live, recovered: true };
  }
  if (!isForgeEligible(live)) return { ok: false, result: FORGE_RESULTS.IGNORED_INELIGIBLE, issue: live, evidence: [`live labels=${normalizeLabels(live).join(', ') || '(none)'}`] };
  const acquired = acquireForgeLock({ lockPath, issueNumber: targetNumber, pid, host, now, processChecker });
  if (!acquired.ok) return { ok: false, ...acquired, issue: live };
  try {
    const verifiedBeforeMutation = await fetchLiveIssue(targetNumber);
    if (!isForgeEligible(verifiedBeforeMutation)) return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, issue: verifiedBeforeMutation, evidence: ['readiness changed before mutation'] };
    const labels = normalizeLabels(verifiedBeforeMutation).filter((label) => label !== 'forge:ready');
    labels.push('forge:working');
    await updateLabels(targetNumber, labels);
    const verifiedAfterMutation = await fetchLiveIssue(targetNumber);
    const after = normalizeLabels(verifiedAfterMutation);
    if (!after.includes('pm:ready') || !after.includes('forge:working') || after.includes('forge:ready')) {
      return { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, issue: verifiedAfterMutation, evidence: ['claim label mutation did not verify'] };
    }
    const prepared = prepareForgeContext({ issue: verifiedAfterMutation, repoRoot, startingSha, projectState, bootstrap, now });
    const comment = JSON.stringify({ agent: 'Forge', issue: targetNumber, status: 'CLAIMED', startingSha, contextPath: prepared.path, automationBoundary: 'FULLY_AUTOMATIC_CODEX_CLI' });
    const posted = await postComment(verifiedAfterMutation, comment);
    if (!posted?.ok) {
      atomicWriteJson(statePath, { issueNumber: targetNumber, status: 'REPORTING_REQUIRED', comment, claimCommentPosted: false, claimedAt: now().toISOString() });
      return { ok: false, result: FORGE_RESULTS.REPORTING_REQUIRED, issue: verifiedAfterMutation, contextPath: prepared.path, evidence: ['labels claimed; acknowledgement delivery failed'] };
    }
    atomicWriteJson(statePath, { issueNumber: targetNumber, status: 'CLAIMED', claimCommentPosted: true, contextPath: prepared.path, claimedAt: now().toISOString() });
    const report = await reporter({ event: 'task_claimed', issue: verifiedAfterMutation, contextPath: prepared.path });
    if (!execute) return { ok: true, result: FORGE_RESULTS.HUMAN_START_REQUIRED, issue: verifiedAfterMutation, contextPath: prepared.path, report };
    let execution = await execute({ contextPath: prepared.path, issue: verifiedAfterMutation });
    if (execution?.ok) {
      const verifiedCompletion = await fetchLiveIssue(targetNumber);
      const completionLabels = normalizeLabels(verifiedCompletion);
      const submitted = completionLabels.includes('forge:done')
        && completionLabels.includes('pm:review')
        && !completionLabels.includes('forge:working')
        && !completionLabels.includes('pm:ready');
      if (submitted) {
        return { ok: true, result: FORGE_RESULTS.AUTONOMOUS_STARTED, issue: verifiedCompletion, contextPath: prepared.path, report, execution };
      }
      execution = {
        ...execution,
        ok: false,
        result: 'UNVERIFIED_COMPLETION',
        evidence: [...(execution.evidence ?? []), 'worker exited without verified forge:done plus pm:review']
      };
    }
    const autonomous = FORGE_RESULTS.AUTONOMOUS_BLOCKED;

    const blockedLabels = normalizeLabels(verifiedAfterMutation)
      .filter((label) => !['forge:ready', 'forge:working', 'forge:done', 'forge:blocked', 'pm:ready', 'pm:review'].includes(label));
    blockedLabels.push('forge:blocked', 'pm:review');
    await updateLabels(targetNumber, blockedLabels);
    const verifiedBlocked = await fetchLiveIssue(targetNumber);
    const afterBlocked = normalizeLabels(verifiedBlocked);
    const transitionVerified = afterBlocked.includes('forge:blocked')
      && afterBlocked.includes('pm:review')
      && !afterBlocked.includes('forge:working')
      && !afterBlocked.includes('pm:ready');
    const blockerComment = JSON.stringify(sanitizeReport({
      agent: 'Forge',
      issue: targetNumber,
      status: 'BLOCKED',
      result: execution?.result ?? 'START_FAILURE',
      evidence: execution?.evidence ?? ['Codex execution failed'],
      contextPath: prepared.path
    }));
    const blockedPosted = await postComment(verifiedBlocked, blockerComment);
    return {
      ok: false,
      result: autonomous,
      issue: verifiedBlocked,
      contextPath: prepared.path,
      report,
      execution,
      evidence: transitionVerified && blockedPosted?.ok
        ? execution?.evidence ?? []
        : ['blocked transition or acknowledgement did not verify']
    };
  } finally {
    releaseForgeLock({ lockPath, lock: acquired.lock });
  }
}
