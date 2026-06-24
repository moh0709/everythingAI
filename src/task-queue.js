import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const reportDir = resolve(repoRoot, 'REPORTS');

function runGh(args) {
  const result = spawnSync('gh', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.error) {
    throw new Error(`gh ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `gh ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function taskToken(issue) {
  const match = issue?.title?.match(/EAI-TASK-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

function hasMatchingReport(issue) {
  const token = taskToken(issue);
  if (!token || !existsSync(reportDir)) {
    return false;
  }
  return readdirSync(reportDir).some((name) => {
    const upper = name.toUpperCase();
    return upper.startsWith(token) || upper.startsWith(`TASK-${issue.number}`) || upper.startsWith(`EAI-TASK-${String(issue.number).padStart(3, '0')}`);
  });
}

export async function listRunnableIssues() {
  const raw = runGh(['issue', 'list', '--repo', 'moh0709/everythingAI', '--state', 'open', '--label', 'pm:ready', '--label', 'hermes:ready', '--limit', '20', '--json', 'number,title,labels,url,updatedAt,body']);
  const issues = JSON.parse(raw);
  return issues.filter((issue) => !hasMatchingReport(issue));
}

export async function claimRunnableIssue({ issueNumber } = {}) {
  const issues = await listRunnableIssues();
  if (issueNumber) {
    return issues.find((issue) => issue.number === issueNumber) ?? null;
  }
  return issues[0] ?? null;
}

export function summarizeIssue(issue) {
  return `#${issue.number} ${issue.title}`;
}

export function matchingReportExists(issue) {
  return hasMatchingReport(issue);
}