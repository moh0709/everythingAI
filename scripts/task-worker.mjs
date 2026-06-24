#!/usr/bin/env node
import { claimRunnableIssue, summarizeIssue } from '../src/task-queue.js';

const issueNumber = Number(process.argv[2]);

const issue = Number.isFinite(issueNumber) && issueNumber > 0
  ? await claimRunnableIssue({ issueNumber })
  : await claimRunnableIssue();

if (!issue) {
  console.log('[task-worker] No runnable issue found.');
  process.exitCode = 0;
} else {
  console.log(`[task-worker] Selected issue: ${summarizeIssue(issue)}`);
  console.log('[task-worker] Foundation mode only: no task execution performed by this stub worker.');
}