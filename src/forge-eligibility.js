const AGENT_LIFECYCLE_LABELS = new Set([
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

const PRIORITY_RANKS = new Map([
  ['priority:critical', 0],
  ['priority:high', 1],
  ['priority:medium', 2],
  ['priority:low', 3]
]);

export function normalizeIssueLabels(issue) {
  return (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function isOpen(issue) {
  return String(issue?.state ?? '').toLowerCase() === 'open';
}

function issueTaskId(issue) {
  return String(issue?.title ?? '').match(/\bEAI-TASK-\d+[A-Z]?\b/i)?.[0]?.toUpperCase() ?? null;
}

function dependencyDeclarations(issue) {
  return String(issue?.body ?? '')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:dependency|depends on|blocked by)\s*:\s*(.+?)\s*$/i)?.[1])
    .filter(Boolean);
}

function validHead(value) {
  return /^[a-f0-9]{40}$/i.test(String(value ?? ''));
}

export class EligibilityEngine {
  constructor({
    issues = [],
    approvedReadyLabels = [],
    currentHeadSha = null,
    currentIssueNumber = null,
    controllerIssueNumber = null,
    maintenanceIssueNumbers = [],
    maintenanceLabels = ['maintenance'],
    cycleId = null,
    processedCycleId = null,
    processedIssues = []
  } = {}) {
    this.issues = [...issues];
    this.approvedReadyLabels = new Set(approvedReadyLabels.filter(Boolean));
    this.currentHeadSha = validHead(currentHeadSha) ? String(currentHeadSha) : null;
    this.currentIssueNumber = Number.isFinite(Number(currentIssueNumber)) ? Number(currentIssueNumber) : null;
    this.controllerIssueNumber = Number.isFinite(Number(controllerIssueNumber)) ? Number(controllerIssueNumber) : null;
    this.maintenanceIssueNumbers = new Set(maintenanceIssueNumbers.map(Number).filter(Number.isFinite));
    this.maintenanceLabels = new Set(maintenanceLabels.filter(Boolean));
    this.cycleId = cycleId;
    this.processedCycleId = processedCycleId;
    this.processedIssues = [...processedIssues];
    this.issuesByNumber = new Map(this.issues.map((candidate) => [Number(candidate.number), candidate]));
    this.issueNumbersByTaskId = new Map(this.issues
      .map((candidate) => [issueTaskId(candidate), Number(candidate.number)])
      .filter(([taskId, number]) => taskId && Number.isFinite(number)));
    this.dependenciesByIssue = new Map();
    this.unresolvedDependencies = new Set();
    this.dependencyCycles = new Set();
    this.dependencyDepths = new Map();
    this.#normalizeDependencies();
  }

  #normalizeDependencies() {
    for (const candidate of this.issues) {
      const number = Number(candidate.number);
      const declarations = dependencyDeclarations(candidate);
      const dependencies = new Set();
      let unresolved = false;

      for (const declaration of declarations) {
        if (/^(?:none|n\/?a)\.?$/i.test(declaration.trim())) continue;
        let resolvedInDeclaration = false;
        for (const match of declaration.matchAll(/#(\d+)/g)) {
          dependencies.add(Number(match[1]));
          resolvedInDeclaration = true;
        }
        for (const match of declaration.matchAll(/\bEAI-TASK-\d+[A-Z]?\b/gi)) {
          const dependencyNumber = this.issueNumbersByTaskId.get(match[0].toUpperCase());
          if (Number.isFinite(dependencyNumber)) {
            dependencies.add(dependencyNumber);
            resolvedInDeclaration = true;
          }
        }
        if (!resolvedInDeclaration) unresolved = true;
      }

      this.dependenciesByIssue.set(number, [...dependencies].sort((left, right) => left - right));
      if (unresolved) this.unresolvedDependencies.add(number);
    }

    const visit = (number, trail = new Set()) => {
      if (this.dependencyDepths.has(number)) return this.dependencyDepths.get(number);
      if (trail.has(number)) {
        for (const issueNumber of trail) this.dependencyCycles.add(issueNumber);
        this.dependencyCycles.add(number);
        return 0;
      }
      const nextTrail = new Set(trail).add(number);
      let depth = 0;
      for (const dependency of this.dependenciesByIssue.get(number) ?? []) {
        if (!this.issuesByNumber.has(dependency)) continue;
        depth = Math.max(depth, visit(dependency, nextTrail) + 1);
      }
      this.dependencyDepths.set(number, depth);
      return depth;
    };

    for (const candidate of this.issues) visit(Number(candidate.number));
  }

  evaluate(issue) {
    const issueNumber = Number(issue?.number);
    const labels = normalizeIssueLabels(issue);
    const labelSet = new Set(labels);
    const reasons = [];
    const dependencies = this.dependenciesByIssue.get(issueNumber) ?? [];
    const hasApprovedReady = labelSet.has('forge:ready')
      || [...this.approvedReadyLabels].some((label) => labelSet.has(label));

    if (!isOpen(issue)) reasons.push('not_open');
    if (!labelSet.has('pm:ready')) reasons.push('missing_pm_ready');
    if (!hasApprovedReady) reasons.push('missing_forge_ready');
    if (labelSet.has('forge:working')) reasons.push('forge_working');
    if (labelSet.has('forge:done')) reasons.push('forge_done');
    if (labelSet.has('forge:blocked')) reasons.push('forge_blocked');
    if (labelSet.has('pm:review')) reasons.push('pm_review');
    if (labels.some((label) => AGENT_LIFECYCLE_LABELS.has(label) && !label.startsWith('forge:'))) {
      reasons.push('competing_agent_owner');
    }
    if (issueNumber === this.currentIssueNumber) reasons.push('currently_executing');
    if (issueNumber === this.controllerIssueNumber) reasons.push('self_controller');
    if (this.maintenanceIssueNumbers.has(issueNumber)
      || labels.some((label) => this.maintenanceLabels.has(label))) {
      reasons.push('maintenance_issue');
    }
    if (this.unresolvedDependencies.has(issueNumber)) reasons.push('dependency_unresolved');
    if (this.dependencyCycles.has(issueNumber)) reasons.push('dependency_cycle');
    if (dependencies.some((number) => !this.issuesByNumber.has(number))) reasons.push('dependency_unresolved');
    if (dependencies.some((number) => {
      const dependency = this.issuesByNumber.get(number);
      return dependency && String(dependency.state ?? '').toLowerCase() !== 'closed';
    })) reasons.push('dependency_blocked');

    const processed = this.processedIssues.find((entry) => Number(entry?.issueNumber) === issueNumber);
    if (processed && this.processedCycleId && this.processedCycleId === this.cycleId) {
      reasons.push('already_processed');
    }
    if (processed && this.currentHeadSha && validHead(processed.headSha) && processed.headSha === this.currentHeadSha) {
      reasons.push('head_unchanged');
    }

    const explicitPriorityRanks = labels
      .map((label) => PRIORITY_RANKS.get(label))
      .filter(Number.isFinite);
    const priorityRank = explicitPriorityRanks.length ? Math.min(...explicitPriorityRanks) : 2;
    const createdAtMs = Date.parse(issue?.createdAt ?? '');
    return {
      issue,
      issueNumber,
      eligible: reasons.length === 0,
      reasons: [...new Set(reasons)],
      primaryReason: reasons[0] ?? null,
      dependencies,
      dependencyDepth: this.dependencyDepths.get(issueNumber) ?? 0,
      priorityRank,
      createdAt: Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : null
    };
  }

  evaluateAll() {
    return this.issues
      .map((candidate) => this.evaluate(candidate))
      .sort((left, right) => Number(right.eligible) - Number(left.eligible)
        || left.dependencyDepth - right.dependencyDepth
        || left.priorityRank - right.priorityRank
        || (Date.parse(left.createdAt ?? '') || Number.MAX_SAFE_INTEGER) - (Date.parse(right.createdAt ?? '') || Number.MAX_SAFE_INTEGER)
        || left.issueNumber - right.issueNumber);
  }

  select() {
    return this.evaluateAll().find(({ eligible }) => eligible) ?? null;
  }
}

export function classifyForgeEligibility(issue, options = {}) {
  return new EligibilityEngine({ ...options, issues: options.issues ?? [issue] }).evaluate(issue);
}
