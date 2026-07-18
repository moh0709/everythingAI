#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { detectRuntimeMode, RUNTIME_MODES } from '../src/runtime-mode.js';
import { assessClaimReadiness, CLAIM_RESULTS } from '../src/task-claim.js';
import { matchingReportExists, readStateIfPresent, summarizeIssue } from '../src/task-queue.js';

export const DECISIONS = {
  EXECUTE: 'EXECUTE',
  IGNORED_EVENT: 'IGNORED_EVENT',
  IGNORED_INELIGIBLE: 'IGNORED_INELIGIBLE',
  BLOCKED_RUNTIME_CONTRACT: 'BLOCKED_RUNTIME_CONTRACT',
  INVALID_EVENT_PAYLOAD: 'INVALID_EVENT_PAYLOAD',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  UNKNOWN_RUNTIME_MODE: 'UNKNOWN_RUNTIME_MODE'
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

function unknownRuntimeResponse(runtime, context) {
  return {
    ok: false,
    result: DECISIONS.UNKNOWN_RUNTIME_MODE,
    source: runtime.source,
    mode: runtime.mode,
    evidence: [
      ...runtime.evidence,
      ...context
    ],
    remediation: runtime.remediation
  };
}

export function discoverWebhookPayload({
  env = process.env,
  argv = process.argv.slice(2),
  stdinText = '',
  readFile = readFileSync,
  runtime = null
} = {}) {
  const activeRuntime = runtime ?? detectRuntimeMode({ env, argv });
  if (activeRuntime.mode === RUNTIME_MODES.UNKNOWN) {
    return unknownRuntimeResponse(activeRuntime, ['webhook payload discovery skipped until runtime mode is explicit']);
  }
  if (activeRuntime.mode !== RUNTIME_MODES.WEBHOOK) {
    return {
      ok: false,
      result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
      source: activeRuntime.source,
      mode: activeRuntime.mode,
      evidence: [
        ...activeRuntime.evidence,
        'webhook payload discovery disabled outside explicit webhook mode'
      ],
      remediation: 'Run the webhook entry path with --mode webhook or HERMES_RUNTIME_MODE=webhook.'
    };
  }

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
  reportExists = matchingReportExists,
  stateReader = readStateIfPresent,
  ghRunner = undefined,
  lockInspector = undefined,
  runtimeDetector = detectRuntimeMode
} = {}) {
  const runtime = runtimeDetector({ env, argv });
  if (runtime.mode === RUNTIME_MODES.UNKNOWN) {
    return unknownRuntimeResponse(runtime, ['payload discovery and queue inspection skipped in unknown runtime mode']);
  }
  if (runtime.mode !== RUNTIME_MODES.WEBHOOK) {
    return {
      ok: false,
      result: DECISIONS.BLOCKED_RUNTIME_CONTRACT,
      source: runtime.source,
      mode: runtime.mode,
      evidence: [
        ...runtime.evidence,
        'webhook entry path requires explicit webhook mode before payload discovery'
      ],
      remediation: 'Run the webhook entry path with --mode webhook or HERMES_RUNTIME_MODE=webhook.'
    };
  }

  const discovery = discoverWebhookPayload({ env, argv, stdinText, readFile, runtime });
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

  const readiness = await assessClaimReadiness({
    issueNumber: Number(payload.issue.number),
    issue: null,
    reportExists,
    stateReader,
    ghRunner,
    lockInspector
  });

  if (readiness.ok) {
    return {
      ok: true,
      result: DECISIONS.EXECUTE,
      source: discovery.source,
      issueNumber: Number(payload.issue.number),
      issue: payload.issue,
      liveIssue: summarizeIssue(readiness.issue),
      claimDecision: 'ELIGIBLE',
      evidence: [
        `labels=${labels.join(', ')}`,
        ...readiness.evidence
      ],
      nextAction: 'claim-and-execute'
    };
  }

  const nonExecutable = readiness.result === CLAIM_RESULTS.CLAIM_CONFLICT
    ? DECISIONS.CLAIM_CONFLICT
    : DECISIONS.IGNORED_INELIGIBLE;

  return {
    ok: true,
    result: nonExecutable,
    source: discovery.source,
    issueNumber: Number(payload.issue.number),
    issue: payload.issue,
    claimDecision: readiness.result,
    evidence: [
      `labels=${labels.join(', ')}`,
      ...(readiness.evidence ?? [])
    ],
    remediation: readiness.result === CLAIM_RESULTS.CLAIM_CONFLICT
      ? 'Revalidate live GitHub labels, report artifacts, and claim lock state before acting.'
      : 'The issue is not runnable from the current live GitHub state.'
  };
}

export async function runWebhookEntry(options = {}) {
  return classifyWebhookEvent(options);
}

async function main() {
  const result = await runWebhookEntry();
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
