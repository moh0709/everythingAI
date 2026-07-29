import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, closeSync, unlinkSync, writeFileSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';
import { sanitizeReport, sanitizeText } from './forge-trigger.js';

export const EXECUTION_RESULTS = Object.freeze({
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  ALREADY_RUNNING: 'ALREADY_RUNNING',
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  START_FAILURE: 'START_FAILURE',
  WORKER_FAILED: 'WORKER_FAILED',
  TIMEOUT: 'TIMEOUT'
});

const DEFAULT_CONTEXT_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_MAX_RUNTIME_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const EXECUTION_RESULT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['status', 'evidence'],
  properties: {
    status: { type: 'string', enum: ['SUBMITTED_FOR_PM_REVIEW', 'BLOCKED'] },
    evidence: { type: 'array', items: { type: 'string' }, maxItems: 20 }
  }
});

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temp, path);
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

function alive(pid, processChecker = (value) => {
  try { process.kill(Number(value), 0); return true; } catch (error) { return error?.code !== 'ESRCH'; }
}) {
  return Number.isInteger(Number(pid)) && Number(pid) > 0 && processChecker(pid);
}

export function readExecutionContext({ contextPath, now = () => new Date(), maxAgeMs = DEFAULT_CONTEXT_MAX_AGE_MS } = {}) {
  if (!contextPath || !existsSync(contextPath)) return { ok: false, result: EXECUTION_RESULTS.INVALID_CONTEXT, evidence: ['context file is missing'] };
  let context;
  try { context = readJson(contextPath); } catch (error) { return { ok: false, result: EXECUTION_RESULTS.INVALID_CONTEXT, evidence: [`context JSON is invalid: ${error.message}`] }; }
  const issue = context?.issue;
  const createdAt = Date.parse(context?.createdAt ?? '');
  if (!issue?.number || typeof issue.body !== 'string' || !/^[0-9a-f]{40}$/i.test(context?.startingSha ?? '') || !Number.isFinite(createdAt)) {
    return { ok: false, result: EXECUTION_RESULTS.INVALID_CONTEXT, evidence: ['context is incomplete'] };
  }
  if (Math.max(0, now().getTime() - createdAt) > maxAgeMs) return { ok: false, result: EXECUTION_RESULTS.INVALID_CONTEXT, evidence: ['context is stale'] };
  return { ok: true, context };
}

function acquireExecutionLock(lockPath, metadata, { now, staleAfterMs, processChecker } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  try {
    const fd = openSync(lockPath, 'wx');
    writeFileSync(fd, `${JSON.stringify(metadata, null, 2)}\n`);
    closeSync(fd);
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') {
      try {
        const current = readJson(lockPath);
        const sameHost = current.hostname === metadata.hostname;
        const createdAt = Date.parse(current.startedAt);
        const ageMs = Number.isFinite(createdAt) ? Math.max(0, now().getTime() - createdAt) : null;
        if (!sameHost || ageMs === null || ageMs <= staleAfterMs || alive(current.ownerPid, processChecker)) return false;
        unlinkSync(lockPath);
        return acquireExecutionLock(lockPath, metadata, { now, staleAfterMs, processChecker });
      } catch { return false; }
    }
    throw error;
  }
}

function releaseExecutionLock(lockPath, expected) {
  if (!existsSync(lockPath)) return;
  try {
    const current = readJson(lockPath);
    if (current.ownerPid === expected.ownerPid && current.issueNumber === expected.issueNumber) unlinkSync(lockPath);
  } catch { /* preserve ambiguous ownership for manual recovery */ }
}

function executionPrompt(contextPath, issueNumber) {
  return `You are Forge executing released EverythingAI issue #${issueNumber}. Read ${contextPath} completely before acting. Work only in the repository and scope defined by that context. Preserve unrelated files, especially any explicitly preserved untracked files. Do not close the issue, self-accept PM work, release dependent tasks, expose secrets, or use destructive Git commands. Use the installed local Git and GitHub CLI for repository and issue operations. Run the required validation, commit focused changes on main, push, and verify the live issue transition. Your final response must match the supplied JSON schema: status SUBMITTED_FOR_PM_REVIEW only after forge:done plus pm:review is verified live; otherwise status BLOCKED with concise sanitized evidence.`;
}

function readWorkerResult(outputPath) {
  try {
    const result = readJson(outputPath);
    if (!['SUBMITTED_FOR_PM_REVIEW', 'BLOCKED'].includes(result?.status) || !Array.isArray(result?.evidence)) return null;
    return sanitizeReport(result);
  } catch {
    return null;
  }
}

export async function startForgeExecution({ contextPath, repoRoot, codexPath = 'codex', statePath, heartbeatPath, lockPath, logPath, outputPath, schemaPath, maxRuntimeMs = DEFAULT_MAX_RUNTIME_MS, maxContextAgeMs = DEFAULT_CONTEXT_MAX_AGE_MS, staleLockAfterMs = DEFAULT_MAX_RUNTIME_MS, now = () => new Date(), processChecker, spawnProcess = spawn, setIntervalFn = setInterval, clearIntervalFn = clearInterval, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
  statePath ??= resolve(repoRoot, '.hermes/forge/execution-state.json');
  heartbeatPath ??= resolve(repoRoot, '.hermes/forge/execution-heartbeat.json');
  lockPath ??= resolve(repoRoot, '.hermes/forge/execution.lock');
  logPath ??= resolve(repoRoot, '.hermes/forge/execution.jsonl');
  outputPath ??= resolve(repoRoot, '.hermes/forge/execution-result.json');
  schemaPath ??= resolve(repoRoot, '.hermes/forge/execution-result.schema.json');
  const contextResult = readExecutionContext({ contextPath, now, maxAgeMs: maxContextAgeMs });
  if (!contextResult.ok) return contextResult;
  const context = contextResult.context;
  const issueNumber = Number(context.issue.number);
  if (existsSync(statePath)) {
    try {
      const state = readJson(statePath);
      if (state.status === 'RUNNING' && alive(state.pid, processChecker)) return { ok: false, result: EXECUTION_RESULTS.ALREADY_RUNNING, issueNumber, evidence: [`worker pid ${state.pid} is alive`] };
    } catch { /* invalid prior state is replaced only after exclusive lock */ }
  }
  const lock = { issueNumber, ownerPid: process.pid, hostname: hostname(), startedAt: now().toISOString() };
  if (!acquireExecutionLock(lockPath, lock, { now, staleAfterMs: staleLockAfterMs, processChecker })) return { ok: false, result: EXECUTION_RESULTS.ALREADY_RUNNING, issueNumber, evidence: ['execution lock is held'] };
  const executionDir = dirname(logPath);
  mkdirSync(executionDir, { recursive: true });
  atomicWrite(schemaPath, EXECUTION_RESULT_SCHEMA);
  if (existsSync(outputPath)) unlinkSync(outputPath);
  const startedAt = now().toISOString();
  let child;
  try {
    const args = ['exec', '--ephemeral', '--json', '--sandbox', 'danger-full-access', '--output-schema', schemaPath, '--output-last-message', outputPath, '-c', 'approval_policy="never"', '-C', repoRoot, executionPrompt(contextPath, issueNumber)];
    child = spawnProcess(codexPath, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch (error) {
    atomicWrite(statePath, { issueNumber, status: 'BLOCKED', result: EXECUTION_RESULTS.START_FAILURE, error: sanitizeText(error.message), startedAt });
    releaseExecutionLock(lockPath, lock);
    return { ok: false, result: EXECUTION_RESULTS.START_FAILURE, issueNumber, evidence: ['Codex process could not start'] };
  }
  const state = { issueNumber, status: 'RUNNING', result: EXECUTION_RESULTS.STARTED, pid: child.pid, startedAt, startingSha: context.startingSha, contextPath, maxRuntimeMs };
  atomicWrite(statePath, state);
  const writeHeartbeat = (status = 'RUNNING') => atomicWrite(heartbeatPath, { issueNumber, pid: child.pid, status, lastHeartbeat: now().toISOString(), startingSha: context.startingSha });
  const appendOutput = (chunk) => appendFileSync(logPath, `${sanitizeText(chunk)}\n`);
  child.stdout?.on('data', appendOutput);
  child.stderr?.on('data', appendOutput);
  writeHeartbeat();
  return await new Promise((resolvePromise) => {
    let settled = false;
    const heartbeatTimer = setIntervalFn(() => { if (!settled) writeHeartbeat(); }, HEARTBEAT_INTERVAL_MS);
    const timeoutTimer = setTimeoutFn(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGTERM'); } catch { /* preserve timeout result */ }
      clearIntervalFn(heartbeatTimer);
      writeHeartbeat('TIMED_OUT');
      atomicWrite(statePath, { ...state, status: 'TIMED_OUT', result: EXECUTION_RESULTS.TIMEOUT, finishedAt: now().toISOString() });
      releaseExecutionLock(lockPath, lock);
      resolvePromise({ ok: false, result: EXECUTION_RESULTS.TIMEOUT, issueNumber });
    }, maxRuntimeMs);
    const finish = (result, status, workerResult = null) => {
      if (settled) return;
      settled = true;
      clearTimeoutFn(timeoutTimer);
      clearIntervalFn(heartbeatTimer);
      writeHeartbeat('STOPPED');
      atomicWrite(statePath, { ...state, status, result, workerResult, finishedAt: now().toISOString() });
      releaseExecutionLock(lockPath, lock);
      resolvePromise({ ok: result === EXECUTION_RESULTS.COMPLETED, result, issueNumber, exitCode: result === EXECUTION_RESULTS.COMPLETED ? 0 : 1, evidence: workerResult?.evidence ?? [] });
    };
    child.once('error', (error) => finish(EXECUTION_RESULTS.START_FAILURE, 'BLOCKED'));
    child.once('close', (code) => {
      const workerResult = readWorkerResult(outputPath);
      const submitted = code === 0 && workerResult?.status === 'SUBMITTED_FOR_PM_REVIEW';
      finish(submitted ? EXECUTION_RESULTS.COMPLETED : EXECUTION_RESULTS.WORKER_FAILED, submitted ? 'COMPLETED' : 'BLOCKED', workerResult);
    });
  });
}
