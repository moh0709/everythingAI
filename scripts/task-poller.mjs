#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { detectRuntimeMode, RUNTIME_MODES } from '../src/runtime-mode.js';
import { listRunnableIssues, summarizeIssue } from '../src/task-queue.js';

const intervalMs = 60_000;

function runWorker(issueNumber) {
  const args = ['scripts/task-worker.mjs', '--mode', 'polling'];
  if (issueNumber) {
    args.push(String(issueNumber));
  }
  const result = spawnSync('node', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  return result.status ?? 0;
}

export async function pollOnce({ listIssues = listRunnableIssues, dispatchWorker = runWorker, watch = false } = {}) {
  const issues = await listIssues();
  if (issues.length === 0) {
    console.log('[task-poller] No runnable issues found.');
    return null;
  }

  console.log('[task-poller] Runnable issues:');
  for (const issue of issues) {
    console.log(`- ${summarizeIssue(issue)}`);
  }

  if (watch) {
    console.log(`[task-poller] Dispatching worker for ${summarizeIssue(issues[0])}`);
    await dispatchWorker(issues[0].number);
  }

  return issues[0];
}

export async function watchLoop({ iterations = Infinity, pauseMs = intervalMs, listIssues, dispatchWorker } = {}) {
  let count = 0;
  while (count < iterations) {
    await pollOnce({ listIssues, dispatchWorker, watch: true });
    count += 1;
    if (count < iterations) {
      await delay(pauseMs);
    }
  }
}

export async function runPollingEntry({
  env = process.env,
  argv = process.argv.slice(2),
  runtimeDetector = detectRuntimeMode,
  listIssues = listRunnableIssues,
  dispatchWorker = runWorker,
  pauseMs = intervalMs,
  iterations = Infinity
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

  const watch = argv.includes('--watch');
  if (watch) {
    return watchLoop({ iterations, pauseMs, listIssues, dispatchWorker });
  }

  return pollOnce({ listIssues, dispatchWorker, watch: false });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runPollingEntry();
  if (result && result.ok === false) {
    process.exitCode = 1;
  }
}
