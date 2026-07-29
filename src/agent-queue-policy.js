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

export function normalizeIssueLabels(issue) {
  return (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function isOpen(issue) {
  return String(issue?.state ?? '').toLowerCase() === 'open';
}

function hasOnlyAgentQueue(labels, readyLabel) {
  return labels.includes('pm:ready')
    && labels.includes(readyLabel)
    && !labels.some((label) => AGENT_LIFECYCLE_LABELS.has(label) && label !== readyLabel);
}

export function isForgeEligibleForQueue(issue) {
  return isOpen(issue) && hasOnlyAgentQueue(normalizeIssueLabels(issue), 'forge:ready');
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
