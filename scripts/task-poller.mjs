#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';
import { listRunnableIssues, summarizeIssue } from '../src/task-queue.js';

const watch = process.argv.includes('--watch');
const intervalMs = 60_000;

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
  return issues[0];
}

if (!watch) {
  await pollOnce();
  process.exitCode = 0;
} else {
  // Continuous poll loop for cron/watch usage.
  // The worker logic intentionally processes only one issue per iteration.
  while (true) {
    await pollOnce();
    await delay(intervalMs);
  }
}