#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { listRunnableIssues, summarizeIssue } from '../src/task-queue.js';

const watch = process.argv.includes('--watch');
const intervalMs = 60_000;

function runWorker(issueNumber) {
  const args = ['scripts/task-worker.mjs'];
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

async function pollOnce() {
  const issues = await listRunnableIssues();
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
    runWorker(issues[0].number);
  }

  return issues[0];
}

if (!watch) {
  await pollOnce();
  process.exitCode = 0;
} else {
  while (true) {
    await pollOnce();
    await delay(intervalMs);
  }
}