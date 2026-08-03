import { existsSync, mkdirSync, openSync, readFileSync, closeSync, unlinkSync, renameSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';
import { classifyForgeQueueIssue, isForgeEligibleForQueue, normalizeIssueLabels } from './agent-queue-policy.js';
import { EligibilityEngine } from './forge-eligibility.js';

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

export function classifyForgeIssueEligibility(issue) {
  return classifyForgeQueueIssue(issue);
}

function maintenanceCycleId(now) {
  return now().toISOString().slice(0, 10);
}

function defaultMaintenanceStatePath(repoRoot) { return resolve(repoRoot, '.hermes/forge/maintenance-state.json'); }

export function readForgeProcessingState(statePath) {
  try {
    const state = readJson(statePath);
    return {
      cycleId: typeof state?.cycleId === 'string' ? state.cycleId : null,
      processedIssues: Array.isArray(state?.processedIssues) ? state.processedIssues : []
    };
  } catch {
    return { cycleId: null, processedIssues: [] };
  }
}

export function markForgeProcessed({ statePath, issueNumber, cycleId, result, headSha, now = () => new Date() } = {}) {
  const state = readForgeProcessingState(statePath);
  const nextCycleId = cycleId ?? state.cycleId ?? maintenanceCycleId(now);
  const processed = state.cycleId === nextCycleId ? state.processedIssues : [];
  const withoutDuplicate = processed.filter((entry) => Number(entry.issueNumber) !== Number(issueNumber));
  withoutDuplicate.push({
    issueNumber: Number(issueNumber),
    processedAt: now().toISOString(),
    result: String(result ?? 'processed'),
    headSha: typeof headSha === 'string' ? headSha : undefined
  });
  atomicWriteJson(statePath, { cycleId: nextCycleId, processedIssues: withoutDuplicate });
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

function hasVerifiedForgeSubmission(issue) {
  const labels = normalizeLabels(issue);
  return (labels.includes('forge:done') || labels.includes('forge:blocked'))
    && labels.includes('pm:review')
    && !labels.includes('forge:working')
    && !labels.includes('pm:ready');
}

function evaluateForgeClaimCandidate({ issue, issueUniverse, processingStatePath, eligibilityOptions = {} }) {
  const targetNumber = Number(issue.number);
  const issues = (issueUniverse ?? [issue]).filter((candidate) => Number(candidate.number) !== targetNumber);
  issues.push(issue);
  const processingState = readForgeProcessingState(processingStatePath);
  const engine = new EligibilityEngine({
    ...eligibilityOptions,
    issues,
    processedCycleId: processingState.cycleId,
    processedIssues: processingState.processedIssues
  });
  return engine.evaluate(issue);
}

export async function claimForgeIssue({ issue, fetchLiveIssue, fetchIssueUniverse = null, updateLabels, postComment, lockPath, repoRoot = process.cwd(), statePath = defaultStatePath(repoRoot), processingStatePath = defaultMaintenanceStatePath(repoRoot), eligibilityOptions = {}, heldLock = null, startingSha = 'unknown', projectState = '', bootstrap = '', now = () => new Date(), pid = process.pid, host = hostname(), processChecker, reporter = async () => ({ sent: false, reason: 'not-configured' }), execute = null } = {}) {
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
  if (!heldLock) {
    const liveEligibility = evaluateForgeClaimCandidate({ issue: live, processingStatePath, eligibilityOptions });
    if (!liveEligibility.eligible) return { ok: false, result: FORGE_RESULTS.IGNORED_INELIGIBLE, issue: live, evidence: [`skip_reasons=${liveEligibility.reasons.join('|') || 'not_eligible'} live labels=${normalizeLabels(live).join(', ') || '(none)'}`] };
  }
  const acquired = heldLock
    ? { ok: true, lock: heldLock, externallyOwned: true }
    : acquireForgeLock({ lockPath, issueNumber: targetNumber, pid, host, now, processChecker });
  if (!acquired.ok) return { ok: false, ...acquired, issue: live };
  try {
    const verifiedBeforeMutation = await fetchLiveIssue(targetNumber);
    const issueUniverse = fetchIssueUniverse ? await fetchIssueUniverse() : [verifiedBeforeMutation];
    const verifiedEligibility = evaluateForgeClaimCandidate({ issue: verifiedBeforeMutation, issueUniverse, processingStatePath, eligibilityOptions });
    if (!verifiedEligibility.eligible) return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, issue: verifiedBeforeMutation, evidence: [`skip_reasons=${verifiedEligibility.reasons.join('|') || 'not_eligible'} eligibility changed before mutation`] };
    const readyLabels = new Set(['forge:ready', ...(eligibilityOptions.approvedReadyLabels ?? [])]);
    const labels = normalizeLabels(verifiedBeforeMutation).filter((label) => !readyLabels.has(label));
    labels.push('forge:working');
    await updateLabels(targetNumber, labels);
    const verifiedAfterMutation = await fetchLiveIssue(targetNumber);
    const after = normalizeLabels(verifiedAfterMutation);
    const readyLabelRemains = [...readyLabels].some((label) => after.includes(label));
    if (!after.includes('pm:ready') || !after.includes('forge:working') || readyLabelRemains) {
      return { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, issue: verifiedAfterMutation, evidence: ['claim label mutation did not verify'] };
    }
    const prepared = prepareForgeContext({ issue: verifiedAfterMutation, repoRoot, startingSha, projectState, bootstrap, now });
    markForgeProcessed({ statePath: processingStatePath, issueNumber: targetNumber, cycleId: eligibilityOptions.cycleId, result: 'CLAIMED', headSha: startingSha, now });
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
      if (hasVerifiedForgeSubmission(verifiedCompletion)) {
        return { ok: true, result: FORGE_RESULTS.AUTONOMOUS_STARTED, issue: verifiedCompletion, contextPath: prepared.path, report, execution };
      }
      execution = {
        ...execution,
        ok: false,
        result: 'UNVERIFIED_COMPLETION',
        evidence: [...(execution.evidence ?? []), 'worker exited without verified forge:done plus pm:review']
      };
    }
    const verifiedAfterExecution = await fetchLiveIssue(targetNumber);
    if (hasVerifiedForgeSubmission(verifiedAfterExecution)) {
      return { ok: true, result: FORGE_RESULTS.AUTONOMOUS_STARTED, issue: verifiedAfterExecution, contextPath: prepared.path, report, execution: { ...execution, staleFinalizationIgnored: true } };
    }
    const autonomous = FORGE_RESULTS.AUTONOMOUS_BLOCKED;

    const blockedLabels = normalizeLabels(verifiedAfterExecution)
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
    if (!acquired.externallyOwned) releaseForgeLock({ lockPath, lock: acquired.lock });
  }
}
