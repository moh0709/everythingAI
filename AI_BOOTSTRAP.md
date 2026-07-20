# EverythingAI — Enterprise AI Bootstrap and Operating Governance

## 1. Purpose

This document bootstraps any AI, automation, engineer, reviewer, or operator working on EverythingAI.

It defines authority, lifecycle, safety boundaries, evidence standards, repository rules, execution contracts, escalation behavior, and production-readiness gates.

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

When sources conflict, stop and resolve the conflict conservatively. Never silently select the more convenient interpretation.

## 3. Roles and Separation of Duties

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
- Never claims implementation or live evidence without tool-supported proof.

### Execution Agent — Hermes AI

- Claims only released tasks.
- Implements the issue body exactly and narrowly.
- Produces tests, reports, logs, handover JSON, state updates, and commit evidence.
- Returns BLOCKED when required access or evidence is unavailable.
- Never self-accepts completed work.

### Human Operator

- Performs direct SSH/root/sudo operations that restricted AI execution environments cannot safely or technically perform.
- Follows approved runbooks and records sanitized evidence.

## 4. Mandatory Startup Sequence

Before any implementation or project-state decision:

1. Load `PROJECT_STATE.md`.
2. Load this `AI_BOOTSTRAP.md`.
3. Read the full current GitHub issue and all authoritative PM comments.
4. Load the Hermes PM/QA First-Pass skill or equivalent accepted workflow.
5. Confirm repository, branch, working directory, and current commit.
6. Confirm the issue is dependency-satisfied.
7. Confirm it is the only task released with both `pm:ready` and `hermes:ready`.
8. Build an acceptance matrix.
9. Perform risk analysis.
10. Identify required production, host, or external evidence before coding.

If any prerequisite is missing or contradictory, return BLOCKED or request PM correction through the issue. Do not improvise around governance.

## 5. Task Lifecycle

```text
Observe
  -> Read authoritative context
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

## 6. Queue and Claim Contract

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

## 7. Release and Acceptance Rules

- PM releases exactly one dependency-satisfied task at a time.
- Hermes must not execute unreleased issues.
- PM alone accepts or rejects work.
- Implementation completion is not acceptance.
- A closed issue without explicit PM acceptance must not be treated as accepted unless the accepted governance records clearly say otherwise.
- Later tasks remain unreleased until the current dependency is accepted.

Completion labels:

- Success submission: `hermes:done` + `pm:review`
- Truthful blocker: `hermes:blocked` + `pm:review`
- Active execution: `hermes:working`
- Queue eligibility: `pm:ready` + `hermes:ready`
- Accepted result: `pm:accepted` where used by the repository contract

## 8. Acceptance Matrix Requirement

Before implementation, convert every issue criterion into a table with:

- criterion ID;
- exact requirement;
- implementation location;
- validation method;
- evidence artifact;
- status: pending, pass, fail, blocked, not applicable;
- limitation or remediation.

No criterion may disappear from the final report.

## 9. Risk Analysis Requirement

At minimum evaluate:

- data loss;
- duplicate execution;
- privilege escalation;
- secret exposure;
- destructive Git operations;
- runtime ambiguity;
- restart storms;
- stale state;
- partial deployment;
- rollback failure;
- production impact;
- dependency bypass;
- evidence mismatch;
- unavailable host permissions.

High-impact risks require explicit preventive and detective controls before implementation.

## 10. Repository and Git Rules

- Work directly on `main` only where the issue or accepted repository governance explicitly requires it.
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

## 11. Coding and Architecture Discipline

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

## 12. Runtime Mode Contract

Runtime roles must remain separate:

- `POLLING`: queries the GitHub queue directly and never discovers webhook payloads.
- `WEBHOOK`: processes only explicitly delivered webhook input.
- `GATEWAY`: conversational messaging and delegation; not an implicit task executor.
- `UNKNOWN`: performs no GitHub mutation or payload inspection.

No runtime may infer webhook mode from text mentioning GitHub.

## 13. Validation Policy

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

## 14. Evidence Standard

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
- clean repository status.

Evidence must be sanitized but specific. Do not publish tokens, credentials, raw environment values, or full private payloads.

## 15. PASS, BLOCKED, and REJECTED

### PASS

Use PASS only when every acceptance criterion is met and all required evidence exists.

### BLOCKED

Use BLOCKED when implementation or validation cannot safely complete because of:

- missing permissions;
- unavailable production host;
- platform approval gate;
- missing dependency;
- unavailable credentials;
- unsafe environment;
- unresolved ambiguity;
- required evidence that cannot be collected.

A BLOCKED result must contain:

- exact blocker;
- evidence;
- impact;
- safe remediation;
- work completed;
- work not completed;
- no implied success.

### REJECTED

Use REJECTED when the implementation contradicts requirements, evidence, safety rules, or architecture and requires correction.

## 16. Privileged Operations Policy

- Scheduled runners must not repeatedly retry privileged commands blocked by platform consent gates.
- Interactive AI sessions must not bypass failed consent or permission gates.
- When the AI platform cannot perform approved root/sudo work, switch to direct human-operated SSH execution.
- Human operator commands must come from an accepted runbook or PM-approved directive.
- After manual provisioning, Hermes may resume non-privileged validation and evidence collection.
- Never report a host mutation unless post-operation checks prove it occurred.

## 17. Deployment Safety

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

## 18. Documentation and Artifact Contract

Every task must update all artifacts required by its issue. Typical artifacts:

- `REPORTS/<task-report>.md`
- `docs/HANDOVER_<date>_<task>.json`
- `LOGS/<task>-terminal.log`
- `.hermes/state.json`
- operating manual or runbook where applicable

Artifact claims, commit metadata, labels, and issue comments must agree.

## 19. PM Review Checklist

The PM must independently inspect:

- dependency status;
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

## 20. Current Bootstrap State

Refer to `PROJECT_STATE.md` for the current canonical state.

At the time of this enterprise bootstrap version:

- Phase 3 is blocked at #68/#76.
- Repository and offline systemd validation pass.
- Direct Linux SSH provisioning is required because Hermes cannot pass the platform privileged-command gate.
- Issue #69 must remain unreleased.

## 21. Communication Contract

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
