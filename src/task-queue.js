import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const reportDir = resolve(repoRoot, 'REPORTS');
const logDir = resolve(repoRoot, 'LOGS');
const statePath = resolve(repoRoot, '.hermes/state.json');

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

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

function issueTaskId(issue) {
  return taskToken(issue) ?? `TASK-${issue.number}`;
}

function reportPathForIssue(issue) {
  return resolve(reportDir, `${issueTaskId(issue)}-HERMES-WORKER-LIFECYCLE.md`);
}

function logPathForIssue(issue) {
  return resolve(logDir, `${issueTaskId(issue)}-terminal.log`);
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
  return `#${issue.number} ${issueTaskId(issue)} ${issue.title}`;
}

export function matchingReportExists(issue) {
  return hasMatchingReport(issue);
}

export { ensureDir, issueTaskId, logDir, logPathForIssue, reportDir, reportPathForIssue, repoRoot, runGh, statePath };

export function readStateIfPresent() {
  if (!existsSync(statePath)) {
    return null;
  }
  return JSON.parse(readFileSync(statePath, 'utf8'));
}

export function writeStateIfPresent(state) {
  if (!existsSync(statePath)) {
    return false;
  }
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return true;
}