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

const MAINTENANCE_INACTIVE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAINTENANCE_PROCESSED_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAINTENANCE_CONTROLLER_ISSUE_NUMBER = 96;
const PROTECTED_MAINTENANCE_ISSUES = new Set([69]);
const WORKING_LABELS = new Set(['forge:working', 'hermes:working', 'atlas:working']);
const READY_LABELS = new Set(['forge:ready', 'hermes:ready', 'atlas:ready']);
const FORGE_LIFECYCLE_LABELS = new Set(['forge:ready', 'forge:working', 'forge:done', 'forge:blocked', 'pm:ready', 'pm:review']);

function isOpen(issue) {
  return String(issue?.state ?? '').toLowerCase() === 'open';
}

function hasWorkingOwner(labels) {
  return labels.some((label) => WORKING_LABELS.has(label));
}

function hasReadyOwner(labels) {
  return labels.some((label) => READY_LABELS.has(label));
}

function isGovernanceBacklog(issue, labels) {
  const text = `${issue?.title ?? ''}\n${issue?.body ?? ''}\n${labels.join('\n')}`;
  return /\b(governance|administrative|admin|backlog|ops|operations)\b/i.test(text);
}

function maintenanceCycleId(now) {
  return now().toISOString().slice(0, 10);
}

function defaultMaintenanceStatePath(repoRoot) { return resolve(repoRoot, '.hermes/forge/maintenance-state.json'); }

function readMaintenanceState(statePath) {
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

export function markForgeMaintenanceProcessed({ statePath, issueNumber, cycleId, result, headSha, now = () => new Date() } = {}) {
  const state = readMaintenanceState(statePath);
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

function processedMaintenanceSkipReason(issueNumber, { statePath, cycleId, now = () => new Date(), cooldownMs = MAINTENANCE_PROCESSED_COOLDOWN_MS, currentHeadSha } = {}) {
  if (!statePath) return null;
  const state = readMaintenanceState(statePath);
  const effectiveCycleId = cycleId ?? maintenanceCycleId(now);
  const comparableHeadSha = /^[a-f0-9]{40}$/i.test(String(currentHeadSha ?? '')) ? currentHeadSha : null;
  for (const entry of state.processedIssues) {
    if (Number(entry.issueNumber) !== Number(issueNumber)) continue;
    if (state.cycleId === effectiveCycleId) return 'already_processed';
    if (comparableHeadSha && entry.headSha === comparableHeadSha) return 'head_unchanged';
    const processedAt = Date.parse(entry.processedAt ?? '');
    if (Number.isFinite(processedAt) && Math.max(0, now().getTime() - processedAt) <= cooldownMs) return 'already_processed';
  }
  return null;
}

export function classifyForgeMaintenanceIssue(issue, { now = () => new Date(), inactiveAfterMs = MAINTENANCE_INACTIVE_AFTER_MS, controllerIssueNumber = DEFAULT_MAINTENANCE_CONTROLLER_ISSUE_NUMBER, currentExecutingIssueNumber, statePath, cycleId, cooldownMs, currentHeadSha } = {}) {
  const issueNumber = Number(issue?.number);
  if (!isOpen(issue)) return null;
  if (issueNumber === Number(currentExecutingIssueNumber)) return { skipReason: 'currently_executing' };
  if (issueNumber === Number(controllerIssueNumber)) return { skipReason: 'self_controller' };
  if (PROTECTED_MAINTENANCE_ISSUES.has(issueNumber)) return { skipReason: 'dependency_blocked' };
  const labels = normalizeLabels(issue);
  if ((labels.includes('forge:done') || labels.includes('forge:blocked')) && labels.includes('pm:review')) return { skipReason: 'awaiting_pm_review' };
  const processedSkipReason = processedMaintenanceSkipReason(issueNumber, { statePath, cycleId, now, cooldownMs, currentHeadSha });
  if (processedSkipReason) return { skipReason: processedSkipReason };
  if (hasWorkingOwner(labels) || hasReadyOwner(labels)) return { skipReason: 'active_owner' };
  const updatedAt = Date.parse(issue?.updatedAt ?? issue?.createdAt ?? '');
  const isInactive = Number.isFinite(updatedAt) && Math.max(0, now().getTime() - updatedAt) >= inactiveAfterMs;
  if (isInactive) return { rank: 3, priority: 'stale_open_issue' };
  if (isGovernanceBacklog(issue, labels)) return { rank: 4, priority: 'governance_backlog' };
  return null;
}

export function selectForgeMaintenanceIssue(issues = [], options = {}) {
  return issues
    .map((issue) => ({ issue, ...classifyForgeMaintenanceIssue(issue, options) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((left, right) => left.rank - right.rank
      || Date.parse(left.issue.updatedAt ?? left.issue.createdAt ?? 0) - Date.parse(right.issue.updatedAt ?? right.issue.createdAt ?? 0)
      || Number(left.issue.number) - Number(right.issue.number))[0] ?? null;
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

function maintenanceClaimLabels(issue) {
  const labels = normalizeLabels(issue)
    .filter((label) => !FORGE_LIFECYCLE_LABELS.has(label));
  labels.push('forge:working');
  return labels;
}

function blockedReviewLabels(issue) {
  const labels = normalizeLabels(issue)
    .filter((label) => !FORGE_LIFECYCLE_LABELS.has(label));
  labels.push('forge:blocked', 'pm:review');
  return labels;
}

export async function claimForgeMaintenanceIssue({ issue, fetchLiveIssue, updateLabels, postComment, lockPath, repoRoot = process.cwd(), statePath = defaultMaintenanceStatePath(repoRoot), controllerIssueNumber, currentExecutingIssueNumber, startingSha = 'unknown', currentHeadSha = startingSha, projectState = '', bootstrap = '', now = () => new Date(), pid = process.pid, host = hostname(), processChecker, reporter = async () => ({ sent: false, reason: 'not-configured' }), execute = null } = {}) {
  const targetNumber = Number(issue?.number);
  if (!Number.isFinite(targetNumber)) return { ok: false, result: FORGE_RESULTS.IGNORED_INELIGIBLE, evidence: ['missing issue number'] };
  const live = await fetchLiveIssue(targetNumber);
  const maintenanceOptions = { now, controllerIssueNumber, currentExecutingIssueNumber, statePath, currentHeadSha };
  const selected = selectForgeMaintenanceIssue([live], maintenanceOptions);
  if (!selected) {
    const classified = classifyForgeMaintenanceIssue(live, maintenanceOptions);
    return { ok: false, result: FORGE_RESULTS.IGNORED_INELIGIBLE, issue: live, evidence: [`skip_reason=${classified?.skipReason ?? 'not_eligible'} maintenance labels=${normalizeLabels(live).join(', ') || '(none)'}`] };
  }
  const acquired = acquireForgeLock({ lockPath, issueNumber: targetNumber, pid, host, now, processChecker });
  if (!acquired.ok) return { ok: false, ...acquired, issue: live };
  try {
    const verifiedBeforeMutation = await fetchLiveIssue(targetNumber);
    const verifiedSelection = selectForgeMaintenanceIssue([verifiedBeforeMutation], maintenanceOptions);
    if (!verifiedSelection) {
      const classified = classifyForgeMaintenanceIssue(verifiedBeforeMutation, maintenanceOptions);
      return { ok: false, result: FORGE_RESULTS.CLAIM_CONFLICT, issue: verifiedBeforeMutation, evidence: [`skip_reason=${classified?.skipReason ?? 'not_eligible'} maintenance eligibility changed before mutation`] };
    }
    await updateLabels(targetNumber, maintenanceClaimLabels(verifiedBeforeMutation));
    const verifiedAfterMutation = await fetchLiveIssue(targetNumber);
    const after = normalizeLabels(verifiedAfterMutation);
    if (!after.includes('forge:working') || after.includes('forge:ready') || after.includes('pm:review') || after.includes('forge:done') || after.includes('forge:blocked')) {
      return { ok: false, result: FORGE_RESULTS.RUNTIME_ERROR, issue: verifiedAfterMutation, evidence: ['maintenance claim label mutation did not verify'] };
    }
    const prepared = prepareForgeContext({ issue: verifiedAfterMutation, repoRoot, startingSha, projectState, bootstrap, now });
    const comment = JSON.stringify({ agent: 'Forge', issue: targetNumber, status: 'MAINTENANCE_CLAIMED', priority: verifiedSelection.priority, startingSha, contextPath: prepared.path, automationBoundary: 'FULLY_AUTOMATIC_CODEX_CLI' });
    const posted = await postComment(verifiedAfterMutation, comment);
    if (!posted?.ok) return { ok: false, result: FORGE_RESULTS.REPORTING_REQUIRED, issue: verifiedAfterMutation, contextPath: prepared.path, evidence: ['maintenance claim acknowledgement delivery failed'] };
    const report = await reporter({ event: 'maintenance_claimed', issue: verifiedAfterMutation, contextPath: prepared.path });
    if (!execute) return { ok: true, result: FORGE_RESULTS.HUMAN_START_REQUIRED, issue: verifiedAfterMutation, contextPath: prepared.path, report };
    let execution = await execute({ contextPath: prepared.path, issue: verifiedAfterMutation });
    const verifiedCompletion = await fetchLiveIssue(targetNumber);
    if (hasVerifiedForgeSubmission(verifiedCompletion)) {
      markForgeMaintenanceProcessed({ statePath, issueNumber: targetNumber, result: 'SUBMITTED_FOR_PM_REVIEW', headSha: currentHeadSha, now });
      return { ok: true, result: FORGE_RESULTS.AUTONOMOUS_STARTED, issue: verifiedCompletion, contextPath: prepared.path, report, execution };
    }
    if (execution?.ok) {
      execution = {
        ...execution,
        ok: false,
        result: 'UNVERIFIED_COMPLETION',
        evidence: [...(execution.evidence ?? []), 'maintenance worker exited without verified forge:done plus pm:review']
      };
    }
    await updateLabels(targetNumber, blockedReviewLabels(verifiedCompletion));
    const verifiedBlocked = await fetchLiveIssue(targetNumber);
    const afterBlocked = normalizeLabels(verifiedBlocked);
    const transitionVerified = afterBlocked.includes('forge:blocked')
      && afterBlocked.includes('pm:review')
      && !afterBlocked.includes('forge:working');
    const blockerComment = JSON.stringify(sanitizeReport({
      agent: 'Forge',
      issue: targetNumber,
      status: 'BLOCKED',
      result: execution?.result ?? 'START_FAILURE',
      evidence: execution?.evidence ?? ['maintenance Codex execution failed'],
      contextPath: prepared.path
    }));
    const blockedPosted = await postComment(verifiedBlocked, blockerComment);
    if (transitionVerified && blockedPosted?.ok) {
      markForgeMaintenanceProcessed({ statePath, issueNumber: targetNumber, result: 'BLOCKED_FOR_PM_REVIEW', headSha: currentHeadSha, now });
    }
    return {
      ok: false,
      result: FORGE_RESULTS.AUTONOMOUS_BLOCKED,
      issue: verifiedBlocked,
      contextPath: prepared.path,
      report,
      execution,
      evidence: transitionVerified && blockedPosted?.ok
        ? execution?.evidence ?? []
        : ['maintenance blocked transition or acknowledgement did not verify']
    };
  } finally {
    releaseForgeLock({ lockPath, lock: acquired.lock });
  }
}

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
    releaseForgeLock({ lockPath, lock: acquired.lock });
  }
}
