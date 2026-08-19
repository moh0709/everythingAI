# 2026-08-16 CEO-Approved Operating Addendum

> This addendum supersedes conflicting role, queue, phase, and immediate-priority statements later in this document. Existing detailed controls remain binding where they do not conflict with this addendum. Source decision: `docs/PHASE0_RECONCILIATION_BASELINE_2026-08-14.md`.

## Program model

Every run must maintain five separately named tracks:

1. Product and UX
2. Knowledge and Safe Action
3. Enterprise Platform
4. Engineering Operations
5. Governance and Autonomous Delivery

Do not use an unqualified phase number as the sole project-status statement. Always name the track.

## Current authority and ownership

- CEO: final business, strategic, commercial, and materially scope-changing decisions.
- ChatGPT: sole PM and release authority; architecture, dependency order, issue reconciliation, acceptance decisions, and milestone reporting.
- ChatGPT: authorized by the CEO on 2026-08-19 to directly execute dependency-satisfied implementation and validation work while preserving evidence and review separation.
- Forge: optional executor only when explicitly released for a future task; no longer a Phase 0 dependency.
- Hermes: only explicitly assigned, non-overlapping operational or infrastructure work.
- Human operator: privileged host operations, SSH/root/sudo, secret provisioning, and actions that safe automation cannot perform.

No worker may invent a maintenance queue, claim unreleased work, self-accept, or infer authorization from a useful repository commit. A commit may remain valid evidence while its issue submission remains unaccepted.

## Current gates

- #103: accepted and closed.
- #105: closed as `not planned` after the CEO removed the Forge prerequisite. The missing scheduler proof did not pass and is retained only as historical evidence.
- #69: protected; no modification or release without explicit CEO authorization.
- #6–#13 and #5: independently PM-accepted and closed as completed on 2026-08-19.
- #4 and #19: closed as superseded/not planned; their obsolete umbrella UI scope is not an active implementation queue.
- #3: remains open pending the final local MVP release-candidate decision.
- #78: future/unreleased Atlas work.
- #106: active local MVP release-candidate validation task under direct ChatGPT execution authority; current decision is `RC_PARTIAL` pending disposable-folder validation. Explicit audit-actor context is implemented and CI-verified.
- #68/#76: explicit Engineering Operations / infrastructure track, not a silent global product blocker.

## Temporary release control

No new major feature may be released until open-issue reconciliation, explicit execution ownership, canonical-document synchronization, a defined local MVP release-candidate baseline, and a complete `RC_PASS` acceptance matrix are achieved.

Small, reversible, evidence-backed documentation, governance, issue-triage, QA, and engineering actions may proceed autonomously within existing authority. Escalate only strategic, architectural, commercial, security, legal, irreversible, privileged, or materially scope-changing decisions.

Report completed phases, major tasks, important dependency clearances, and meaningful capability leaps. Routine progress and recoverable blockers proceed without CEO interruption.

---

# EverythingAI — Enterprise AI Bootstrap and Operating Governance

## 1. Purpose

This document bootstraps any AI, automation, engineer, reviewer, or operator working on EverythingAI.

It defines authority, lifecycle, safety boundaries, evidence standards, repository rules, execution contracts, escalation behavior, production-readiness gates, context-retrieval requirements, and capability-verification rules.

No agent may begin implementation before loading this document and `PROJECT_STATE.md`.

## 2. Authority Hierarchy

Use this precedence order:

1. Explicit Product Owner / CEO decisions.
2. Accepted PM decisions and acceptance comments on GitHub.
3. `PROJECT_STATE.md`.
4. This `AI_BOOTSTRAP.md`.
5. Accepted architecture documents, operating manuals, ADRs, runbooks, and issue bodies.
6. Accepted handover JSON, reports, logs, tests, commits, and runtime evidence.
7. Current implementation and unaccepted agent output.

The hierarchy determines how conflicts are resolved. It does not prevent loading, reading, comparing, validating, or—when authorized—updating any lower-ranked source.

When sources conflict, stop and resolve the conflict conservatively. Never silently select the more convenient interpretation.

## 3. Authoritative Context Retrieval and Capability Verification

The agent must load both authoritative documents before project-state decisions or implementation:

1. `PROJECT_STATE.md`
2. `AI_BOOTSTRAP.md`

A single failed lookup is not sufficient evidence that a file is missing or that access is unavailable. Use all applicable retrieval paths in this order:

1. GitHub repository file on the default branch.
2. Explicit repository path, branch, commit, or repository URL.
3. Connected File Library copy.
4. Current-conversation attachment or materialized copy.
5. Only after all available paths fail may the agent return `BLOCKED` for unavailable context.

The repository default-branch copy is authoritative over a stale Library or conversation copy unless an explicit accepted decision states otherwise.

Before claiming repository access is read-only, unavailable, or incapable of a requested action, the agent must inspect the available connector/tool actions and verify the limitation with tool-supported evidence. One failed request, an incorrect path, a missing file at one location, or an incomplete tool discovery result must not be generalized into a capability limitation.

A context or capability blocker must record:

- source or action attempted;
- exact failure;
- fallback routes attempted;
- capability discovery performed;
- impact on the task;
- safe remediation.

Do not let a transient retrieval error weaken governance, erase known project context, or stop otherwise authorized work.

## 4. Roles and Separation of Duties

### Product Owner / CEO

- Defines business intent and final product authority.
- Approves consequential operational actions when required.
- Does not need to perform routine engineering coordination.

### Lead Architect / PM / QA — ChatGPT

- Maintains architecture and dependency order.
- Creates and releases narrowly scoped tasks.
- Defines acceptance matrices and risk controls.
- Independently reviews Hermes submissions.
- Accepts, rejects, or blocks work based on evidence.
- Never claims implementation, live evidence, or capability limits without tool-supported proof.
- Uses available repository write operations when explicitly authorized rather than incorrectly self-limiting to analysis.

### Execution Agent — Hermes AI

- Claims only released tasks.
- Implements the issue body exactly and narrowly.
- Produces tests, reports, logs, handover JSON, state updates, and commit evidence.
- Returns BLOCKED when required access or evidence is genuinely unavailable after required fallback checks.
- Never self-accepts completed work.

### Human Operator

- Performs direct SSH/root/sudo operations that restricted AI execution environments cannot safely or technically perform.
- Follows approved runbooks and records sanitized evidence.

## 5. Mandatory Startup Sequence

Before any implementation or project-state decision:

1. Discover available repository, file, issue, and write capabilities when they are not already known in the session.
2. Load `PROJECT_STATE.md` from the repository default branch.
3. Load this `AI_BOOTSTRAP.md` from the repository default branch.
4. If either lookup fails, execute the retrieval fallback contract in Section 3.
5. Compare fallback copies against the repository version when both are available.
6. Read the full current GitHub issue and all authoritative PM comments.
7. Load the Hermes PM/QA First-Pass skill or equivalent accepted workflow.
8. Confirm repository, branch, working directory, and current commit.
9. Confirm the issue is dependency-satisfied.
10. Confirm it is the only task released with both `pm:ready` and `hermes:ready`.
11. Build an acceptance matrix.
12. Perform risk analysis.
13. Identify required production, host, or external evidence before coding.

If a prerequisite remains missing or contradictory after the required fallback and verification steps, return BLOCKED or request PM correction through the issue. Do not improvise around governance and do not declare a blocker prematurely.

## 6. Task Lifecycle

```text
Observe
  -> Discover capabilities
  -> Load both authoritative documents
  -> Exhaust retrieval fallbacks if needed
  -> Read authoritative issue context
  -> Verify dependency and queue eligibility
  -> Claim atomically
  -> Acceptance matrix
  -> Risk analysis
  -> Plan
  -> Implement narrowly
  -> Adversarial QA
  -> Validate
  -> Produce evidence
  -> Commit and push
  -> Update state and issue
  -> PM review
  -> PM acceptance or correction
  -> Release next dependency
```

## 7. Queue and Claim Contract

Eligibility requires all of the following:

- issue is open;
- issue has `pm:ready`;
- issue has `hermes:ready`;
- issue does not have `hermes:working`;
- issue does not have `hermes:done`;
- dependency is accepted;
- no conflicting local state or active claim lock exists;
- no matching completion artifact already proves the task completed.

Claim transition:

1. Obtain exclusive local claim ownership.
2. Re-read live GitHub issue state.
3. Add `hermes:working`.
4. Remove `hermes:ready`.
5. Verify live labels.
6. Update `.hermes/state.json` to `IN_PROGRESS`.
7. Post chronological claim acknowledgement.
8. Begin implementation only after ownership is proven.

Machine-readable claim outcomes:

- `CLAIMED`
- `CLAIM_CONFLICT`
- `NOT_RUNNABLE`
- `ALREADY_COMPLETED`
- `RUNTIME_ERROR`

## 8. Release and Acceptance Rules

- PM releases exactly one dependency-satisfied task at a time.
- Hermes must not execute unreleased issues.
- PM alone accepts or rejects work.
- Implementation completion is not acceptance.
- A closed issue without explicit PM acceptance must not be treated as accepted unless accepted governance records clearly say otherwise.
- Later tasks remain unreleased until the current dependency is accepted.
- Context retrieval failures do not authorize dependency bypass.
- Verified write access does not authorize unrequested scope expansion.

Completion labels:

- Success submission: `hermes:done` + `pm:review`
- Truthful blocker: `hermes:blocked` + `pm:review`
- Active execution: `hermes:working`
- Queue eligibility: `pm:ready` + `hermes:ready`
- Accepted result: `pm:accepted` where used by the repository contract

## 9. Acceptance Matrix Requirement

Before implementation, convert every issue criterion into a table with:

- criterion ID;
- exact requirement;
- implementation location;
- validation method;
- evidence artifact;
- status: pending, pass, fail, blocked, not applicable;
- limitation or remediation.

No criterion may disappear from the final report.

## 10. Risk Analysis Requirement

At minimum evaluate:

- data loss;
- duplicate execution;
- privilege escalation;
- secret exposure;
- destructive Git operations;
- runtime ambiguity;
- restart storms;
- stale state;
- stale authoritative copies;
- false capability assumptions;
- partial deployment;
- rollback failure;
- production impact;
- dependency bypass;
- evidence mismatch;
- unavailable host permissions.

High-impact risks require explicit preventive and detective controls before implementation.

## 11. Repository and Git Rules

- Work directly on `main` only where the issue, user instruction, or accepted repository governance explicitly requires it.
- No destructive Git commands.
- No force push.
- No history rewriting.
- No broad refactor without PM approval.
- Preserve unrelated user changes.
- Keep diffs narrow and reversible.
- Fetch before sequential file updates.
- Never claim a clean working tree without evidence.
- Every final result must include pushed commit SHA(s).
- When the user requests full file code, provide the entire final file, not fragments.
- Always identify exact file paths in implementation discussions.
- Before claiming write access is unavailable, discover and verify connector write operations.
- A `404` for one path proves only that the requested resource was not found at that path; it does not prove the repository is inaccessible or read-only.

## 12. Coding and Architecture Discipline

- Prefer the smallest coherent change.
- Separate runtime roles mechanically, not only by documentation.
- Use explicit configuration over inference.
- Use dependency injection and mocks for deterministic tests.
- Never mutate real GitHub issues from automated tests.
- Fail closed for ambiguous ownership or runtime mode.
- Keep health and inspection tools read-only.
- Persist only necessary state.
- Redact sensitive values by design.
- Document remaining limitations honestly.
- Distinguish resource absence, path error, permission denial, connector limitation, and platform approval gate.

## 13. Runtime Mode Contract

Runtime roles must remain separate:

- `POLLING`: queries the GitHub queue directly and never discovers webhook payloads.
- `WEBHOOK`: processes only explicitly delivered webhook input.
- `GATEWAY`: conversational messaging and delegation; not an implicit task executor.
- `UNKNOWN`: performs no GitHub mutation or payload inspection.

No runtime may infer webhook mode from text mentioning GitHub.

## 14. Validation Policy

Run all checks required by the issue plus applicable repository-wide checks.

Typical baseline:

```bash
npm run framework:doctor
node --test tests/*.test.mjs
npm test
git diff --check
python3 -m json.tool <handover-file>
```

For systemd work, also require:

```bash
systemd-analyze verify <all-unit-files>
systemctl daemon-reload
systemctl enable/start/status <units>
journalctl -u <unit>
```

Only run commands that are safe and authorized in the current environment.

Tests passing does not prove production deployment. Offline unit verification does not prove live service lifecycle behavior.

## 15. Evidence Standard

Every material claim must map to independently reviewable evidence.

Required evidence may include:

- exact changed files;
- commit SHA;
- test command and result;
- terminal log;
- report;
- handover JSON;
- state JSON;
- GitHub label transition;
- chronological issue comments;
- process identity;
- working directory;
- installed service files;
- systemctl status;
- journal excerpts;
- restart and watchdog observations;
- rollback evidence;
- clean repository status;
- connector capability discovery result;
- retrieval fallback record where context access failed.

Evidence must be sanitized but specific. Do not publish tokens, credentials, raw environment values, or full private payloads.

## 16. PASS, BLOCKED, and REJECTED

### PASS

Use PASS only when every acceptance criterion is met and all required evidence exists.

### BLOCKED

Use BLOCKED when implementation or validation cannot safely complete because of:

- missing permissions verified after capability inspection;
- unavailable production host;
- platform approval gate;
- missing dependency;
- unavailable credentials;
- unsafe environment;
- unresolved ambiguity;
- required evidence that cannot be collected;
- authoritative context that remains unavailable after all applicable retrieval fallbacks.

A BLOCKED result must contain:

- exact blocker;
- evidence;
- attempted retrieval or capability checks where relevant;
- impact;
- safe remediation;
- work completed;
- work not completed;
- no implied success.

### REJECTED

Use REJECTED when the implementation contradicts requirements, evidence, safety rules, or architecture and requires correction.

## 17. Privileged Operations Policy

- Scheduled runners must not repeatedly retry privileged commands blocked by platform consent gates.
- Interactive AI sessions must not bypass failed consent or permission gates.
- When the AI platform cannot perform approved root/sudo work, switch to direct human-operated SSH execution.
- Human operator commands must come from an accepted runbook or PM-approved directive.
- After manual provisioning, Hermes may resume non-privileged validation and evidence collection.
- Never report a host mutation unless post-operation checks prove it occurred.
- Distinguish a platform approval restriction from repository write capability; one does not imply the other.

## 18. Deployment Safety

Before enabling a new supervisor or scheduler:

1. Identify the existing runtime and scheduler.
2. Prevent concurrent legacy and replacement workers.
3. Preserve rollback path.
4. Validate configuration without secrets.
5. Prove single-instance ownership.
6. Enable bounded restart behavior.
7. Observe for restart storms.
8. Verify heartbeat and health output.
9. Restore a known accepted final state.

For EverythingAI specifically, the existing Hermes cronjob must not run concurrently with the future systemd poller unless the accepted architecture explicitly proves non-overlapping roles.

## 19. Documentation and Artifact Contract

Every task must update all artifacts required by its issue. Typical artifacts:

- `REPORTS/<task-report>.md`
- `docs/HANDOVER_<date>_<task>.json`
- `LOGS/<task>-terminal.log`
- `.hermes/state.json`
- operating manual or runbook where applicable

Artifact claims, commit metadata, labels, and issue comments must agree.

Updates to authoritative context documents must preserve existing accepted state unless a supported PM or Product Owner decision changes it. Retrieval and capability rules must be kept aligned between `PROJECT_STATE.md` and `AI_BOOTSTRAP.md`.

## 20. PM Review Checklist

The PM must independently inspect:

- dependency status;
- confirmation that both authoritative documents were loaded;
- fallback retrieval evidence if a load failed;
- capability verification supporting any access limitation claim;
- chronological claim evidence;
- exact diff;
- architecture compliance;
- acceptance matrix;
- adversarial tests;
- validation output;
- reports and logs;
- handover JSON;
- state JSON;
- commit and push evidence;
- live runtime evidence;
- secret redaction;
- rollback and limitations;
- final labels.

The PM must not release the next task until acceptance is explicit.

## 21. Current Bootstrap State

Refer to `PROJECT_STATE.md` for the current canonical state.

At the time of this enterprise bootstrap version:

- Phase 3 is blocked at #68/#76.
- Repository and offline systemd validation pass.
- Direct Linux SSH provisioning is required because Hermes cannot pass the platform privileged-command gate.
- Issue #69 must remain unreleased.
- Repository access and authoritative-file loading must be verified through the connector and fallback contract rather than assumed unavailable.

## 22. Communication Contract

Prompts and execution directives intended for Hermes must be delivered as valid JSON unless a specific accepted tool contract requires another format.

Hermes JSON directives should include:

- `task_id`;
- `objective`;
- `authoritative_sources`;
- `required_work`;
- `safety_constraints`;
- `required_evidence`;
- `validation`;
- `completion_contract`.

Do not embed secrets in prompts.
