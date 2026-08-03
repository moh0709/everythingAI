import { classifyForgeEligibility, normalizeIssueLabels } from './forge-eligibility.js';

const AGENT_LIFECYCLE_LABELS = new Set([
  'forge:ready',
  'forge:working',
  'forge:done',
  'forge:blocked',
  'hermes:ready',
  'hermes:working',
  'hermes:done',
  'hermes:blocked',
  'atlas:ready',
  'atlas:working',
  'atlas:done',
  'atlas:blocked'
]);

export { normalizeIssueLabels };

function isOpen(issue) {
  return String(issue?.state ?? '').toLowerCase() === 'open';
}

function hasOnlyAgentQueue(labels, readyLabel) {
  return labels.includes('pm:ready')
    && labels.includes(readyLabel)
    && !labels.some((label) => AGENT_LIFECYCLE_LABELS.has(label) && label !== readyLabel);
}

export function classifyForgeQueueIssue(issue, options = {}) {
  const evaluation = classifyForgeEligibility(issue, options);
  const awaitingPmReview = evaluation.reasons.includes('pm_review')
    && (evaluation.reasons.includes('forge_done') || evaluation.reasons.includes('forge_blocked'));
  return {
    ...evaluation,
    skipReason: awaitingPmReview ? 'awaiting_pm_review' : evaluation.primaryReason,
    priority: evaluation.eligible ? 'released_queue' : undefined
  };
}

export function isForgeEligibleForQueue(issue) {
  return classifyForgeQueueIssue(issue).eligible;
}

export function isHermesEligibleForQueue(issue) {
  return isOpen(issue) && hasOnlyAgentQueue(normalizeIssueLabels(issue), 'hermes:ready');
}

function hasAtlasDelegationContract(body = '') {
  const text = String(body);
  return /Atlas Delegation Contract/i.test(text)
    && /Parent Forge Issue:\s*#\d+/i.test(text)
    && /Starting SHA:\s*[a-f0-9]{40}/i.test(text)
    && /Final SHA:\s*(pending|[a-f0-9]{40})/i.test(text)
    && /Allowed Files:\s*\S+/i.test(text)
    && /Forbidden Files:\s*\S+/i.test(text)
    && /Validation Commands:\s*\S+/i.test(text)
    && /Reporting Destination:\s*\S+/i.test(text);
}

export function isAtlasEligible(issue) {
  const labels = normalizeIssueLabels(issue);
  return isOpen(issue)
    && hasOnlyAgentQueue(labels, 'atlas:ready')
    && labels.includes('pm:approved-delegation')
    && hasAtlasDelegationContract(issue?.body);
}
