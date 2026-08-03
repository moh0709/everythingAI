import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

import { normalizeIssueLabels } from './forge-eligibility.js';

export function sanitizeForgeText(value) {
  return String(value ?? '')
    .replace(/(?:gh[pousr]_|github_pat_|xox[baprs]-|sk-[A-Za-z0-9_-]{10,}|\d{8,12}:[A-Za-z0-9_-]{20,})[A-Za-z0-9._-]*/g, '[REDACTED]')
    .replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/(authorization\s*[:=]\s*bearer\s+|bot_token\s*[:=]\s*|token\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

export function sanitizeForgeValue(value, key = '') {
  if (/(?:authorization|bot.?token|password|private.?key|secret|token)/i.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return sanitizeForgeText(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeForgeValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeForgeValue(entryValue, entryKey)]));
  }
  return value;
}

export class EligibilityReport {
  constructor({
    runId = `forge-${process.pid}-${Date.now()}`,
    cycleId = null,
    headSha = null,
    startedAt = new Date().toISOString(),
    currentIssueNumber = null,
    controllerIssueNumber = null,
    approvedReadyLabels = []
  } = {}) {
    this.report = {
      schemaVersion: 1,
      runId,
      cycleId,
      headSha,
      startedAt,
      completedAt: null,
      currentIssueNumber,
      controllerIssueNumber,
      approvedReadyLabels: [...approvedReadyLabels],
      issues: [],
      selectedIssueNumber: null,
      outcome: 'IN_PROGRESS',
      message: null,
      evidence: []
    };
  }

  record(evaluation) {
    const issue = evaluation?.issue ?? {};
    this.report.issues.push({
      issueNumber: evaluation?.issueNumber ?? Number(issue.number),
      title: issue.title ?? '',
      state: issue.state ?? null,
      labels: normalizeIssueLabels(issue),
      eligible: Boolean(evaluation?.eligible),
      reasons: [...(evaluation?.reasons ?? [])],
      primaryReason: evaluation?.primaryReason ?? null,
      dependencies: [...(evaluation?.dependencies ?? [])],
      dependencyDepth: evaluation?.dependencyDepth ?? 0,
      priorityRank: evaluation?.priorityRank ?? 2,
      createdAt: evaluation?.createdAt ?? null
    });
    return this;
  }

  complete({
    selectedIssueNumber = null,
    outcome,
    message = null,
    evidence = [],
    completedAt = new Date().toISOString()
  } = {}) {
    this.report.selectedIssueNumber = selectedIssueNumber !== null
      && selectedIssueNumber !== undefined
      && Number.isFinite(Number(selectedIssueNumber))
      ? Number(selectedIssueNumber)
      : null;
    this.report.outcome = outcome ?? this.report.outcome;
    this.report.message = message;
    this.report.evidence = [...evidence];
    this.report.completedAt = completedAt;
    return this;
  }

  toJSON() {
    return sanitizeForgeValue(this.report);
  }

  write(path) {
    mkdirSync(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(this.toJSON(), null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, path);
    return path;
  }
}
