#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listRunnableIssues, matchingReportExists, readStateIfPresent, summarizeIssue } from '../src/task-queue.js';

export const DECISIONS = {
  EXECUTE: 'EXECUTE',
  IGNORED_EVENT: 'IGNORED_EVENT',
  IGNORED_INELIGIBLE: 'IGNORED_INELIGIBLE',
  BLOCKED_RUNTIME_CONTRACT: 'BLOCKED_RUNTIME_CONTRACT',
  INVALID_EVENT_PAYLOAD: 'INVALID_EVENT_PAYLOAD',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT'
};

function normalizeArgs(argv) {
  return Array.isArray(argv) ? argv.slice() : [];
}

function normalizeLabels(issue) {
  return (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function filePayload(path, readFile = readFileSync) {
  return readFile(path, 'utf8');
}

function stdinPayload(stdinText, explicit) {
  if (!explicit) {
    return null;
  }
  return stdinText?.trim() ? stdinText : null;
}

export function discoverWebhookPayload({ env = process.env, argv = process.argv.slice(2), stdinText = '', readFile = readFileSync } = {}) {
  const args = normalizeArgs(argv);
  const evidence = [];

  if (env.GITHUB_EVENT_PATH) {
    try {
      const rawText = filePayload(env.GITHUB_EVENT_PATH, readFile);
      return { ok: true, source: 'GITHUB_EVENT_PATH', rawText, evidence: [`read ${env.GITHUB_EVENT_PATH}`] };
    } catch (error) {
      return {
        ok: false,
        result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
        source: 'GITHUB_EVENT_PATH',
        evidence: [`GITHUB_EVENT_PATH=${env.GITHUB_EVENT_PATH}`, `read failed: ${error.message}`],
        remediation: 'Provide a readable GitHub event JSON file at GITHUB_EVENT_PATH.'
      };
    }
  }

  const eventPathIndex = args.indexOf('--event-path');
  if (eventPathIndex >= 0) {
    const eventPath = args[eventPathIndex + 1];
    if (!eventPath) {
      return {
        ok: false,
        result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
        source: '--event-path',
        evidence: ['--event-path was provided without a path argument'],
        remediation: 'Pass a readable JSON file path after --event-path.'
      };
    }
    try {
      const rawText = filePayload(eventPath, readFile);
      return { ok: true, source: '--event-path', rawText, evidence: [`read ${eventPath}`] };
    } catch (error) {
      return {
        ok: false,
        result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
        source: '--event-path',
        evidence: [`--event-path=${eventPath}`, `read failed: ${error.message}`],
        remediation: 'Provide a readable GitHub event JSON file through --event-path.'
      };
    }
  }

  const stdinExplicit = args.includes('--stdin-json');
  const rawText = stdinPayload(stdinText, stdinExplicit);
  if (rawText) {
    return { ok: true, source: 'STDIN', rawText, evidence: ['stdin JSON explicitly enabled'] };
  }

  evidence.push('GITHUB_EVENT_PATH missing', '--event-path missing', 'STDIN not explicitly guaranteed');
  return {
    ok: false,
    result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
    source: null,
    evidence,
    remediation: 'Use GITHUB_EVENT_PATH, --event-path <file>, or explicit --stdin-json input in webhook mode.'
  };
}

export async function classifyWebhookEvent({
  env = process.env,
  argv = process.argv.slice(2),
  stdinText = '',
  readFile = readFileSync,
  issueLister = listRunnableIssues,
  reportExists = matchingReportExists,
  stateReader = readStateIfPresent
} = {}) {
  const discovery = discoverWebhookPayload({ env, argv, stdinText, readFile });
  if (!discovery.ok) {
    return discovery;
  }

  let payload;
  try {
    payload = JSON.parse(discovery.rawText);
  } catch (error) {
    return {
      ok: false,
      result: DECISIONS.INVALID_EVENT_PAYLOAD,
      source: discovery.source,
      evidence: [`JSON parse failed: ${error.message}`],
      remediation: 'Provide a valid JSON payload.'
    };
  }

  const eventName = env.GITHUB_EVENT_NAME ?? payload?.event_name ?? payload?.hook?.type ?? null;
  if (eventName !== 'issues') {
    return {
      ok: true,
      result: DECISIONS.IGNORED_EVENT,
      source: discovery.source,
      evidence: [`event_name=${eventName ?? 'unknown'}`],
      payloadSummary: 'non-issues event'
    };
  }

  if (!payload?.issue || typeof payload.issue !== 'object') {
    return {
      ok: true,
      result: DECISIONS.IGNORED_EVENT,
      source: discovery.source,
      evidence: ['issues event missing issue object'],
      payloadSummary: 'issues event without issue payload'
    };
  }

  const labels = normalizeLabels(payload.issue);
  const hasPmReady = labels.includes('pm:ready');
  const hasHermesReady = labels.includes('hermes:ready');
  if (!hasPmReady || !hasHermesReady) {
    return {
      ok: true,
      result: DECISIONS.IGNORED_INELIGIBLE,
      source: discovery.source,
      evidence: [`labels=${labels.join(', ') || '(none)'}`],
      payloadSummary: `issue #${payload.issue.number ?? 'unknown'} missing readiness labels`
    };
  }

  const issueNumber = Number(payload.issue.number);
  const liveRunnable = await issueLister();
  const liveMatch = liveRunnable.find((issue) => issue.number === issueNumber);
  if (liveMatch) {
    return {
      ok: true,
      result: DECISIONS.EXECUTE,
      source: discovery.source,
      issueNumber,
      issue: payload.issue,
      liveIssue: summarizeIssue(liveMatch),
      evidence: [
        `labels=${labels.join(', ')}`,
        `live-runnable=${summarizeIssue(liveMatch)}`
      ],
      nextAction: 'claim-and-execute'
    };
  }

  const currentState = stateReader();
  const stateConflict = currentState?.currentIssue === issueNumber && currentState?.result === 'IN_PROGRESS';
  const reportConflict = reportExists(payload.issue);

  return {
    ok: true,
    result: stateConflict ? DECISIONS.CLAIM_CONFLICT : (reportConflict ? DECISIONS.IGNORED_INELIGIBLE : DECISIONS.CLAIM_CONFLICT),
    source: discovery.source,
    issueNumber,
    issue: payload.issue,
    evidence: [
      `labels=${labels.join(', ')}`,
      stateConflict ? `state=currentIssue:${currentState.currentIssue}, result:${currentState.result}` : 'state not in progress for this issue',
      reportConflict ? 'matching report exists' : 'no matching report found'
    ],
    remediation: 'Revalidate live GitHub labels and queue state before acting.'
  };
}

async function main() {
  const result = await classifyWebhookEvent();
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
