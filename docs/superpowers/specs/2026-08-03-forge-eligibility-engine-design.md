# Forge Eligibility Engine Design

## Authority and Objective

This design implements the PM-authorized critical task "Fix Forge scheduler eligibility engine." Its objective is to eliminate incorrect issue selection and duplicate Forge claims.

The Windows Scheduled Task `EverythingAI Forge Trigger` remains disabled during implementation and validation. No live GitHub issue mutations are part of automated tests.

## Root Cause

Forge currently has two selection paths:

1. The released queue requires `pm:ready` and `forge:ready` and uses `classifyForgeQueueIssue`.
2. The maintenance queue uses `classifyForgeMaintenanceIssue` and can select unlabeled stale or governance issues.

The second path bypasses explicit PM release. It selected unreleased issue #78 even though that issue had no ready labels and its body said it was not released. The duplicate eligibility implementations also permit behavior to diverge after future changes.

## Scope

Create two focused components:

- `EligibilityEngine`: the only authority for evaluating and ordering Forge issue candidates.
- `EligibilityReport`: a durable, sanitized record produced for every scheduler run.

Replace both the released and maintenance selectors with the engine. Remove stale-age and governance-backlog selection as sources of execution eligibility. Preserve the existing claim and execution lifecycle after a candidate has passed engine evaluation and live revalidation.

## Eligibility Contract

The engine exposes one issue-classification function. Every queue scan and every pre-mutation revalidation calls this same function with an issue and explicit run context.

An issue is eligible only when all conditions pass:

- state is open;
- labels include `pm:ready`;
- labels include `forge:ready` or an explicitly configured approved equivalent;
- labels do not include `forge:working`, `forge:done`, `forge:blocked`, or `pm:review`;
- no competing Hermes or Atlas lifecycle label is present;
- the issue is not the current executing issue;
- the issue is not the configured scheduler/controller issue;
- the issue is not identified as a maintenance issue by an explicit maintenance issue number or maintenance label;
- every declared dependency is resolved and satisfied;
- the issue was not processed in the current maintenance cycle;
- the repository HEAD differs from the HEAD recorded for its last processing.

Approved equivalent ready labels are configuration, not inference. The default configured set is empty, so the default release contract remains exactly `pm:ready + forge:ready`.

The engine returns a structured result containing `eligible`, exact `reasons`, normalized dependencies, dependency depth, priority rank, creation timestamp, and issue number. Ineligible results may contain multiple reasons so the report is complete, while the first reason is the stable primary skip reason used in concise logs.

## Dependency and Priority Rules

The GitHub adapter builds normalized candidate input before evaluation:

- Exact issue references in `Dependency:`, `Depends on:`, or `Blocked by:` declarations are resolved directly.
- Task identifiers such as `EAI-TASK-045` are resolved against task identifiers in issue titles.
- An unresolved dependency declaration fails closed with `dependency_unresolved`.
- A dependency that is not closed fails with `dependency_blocked`.
- An issue under an explicit PM dependency hold fails with `dependency_blocked`, even when its declared dependencies are closed. EverythingAI defaults this hold to issue #69; PM can replace or clear the comma-separated list with `FORGE_DEPENDENCY_HOLD_ISSUE_NUMBERS`.
- Cycles fail closed with `dependency_cycle`.

Eligible issues are sorted deterministically by:

1. dependency depth, with prerequisites before dependents;
2. explicit `priority:critical`, `priority:high`, `priority:medium`, or `priority:low` label;
3. creation date, oldest first;
4. issue number, lowest first, as a stable final tie-breaker.

No existing product labels such as `must-have` or `mvp` are silently interpreted as execution priority.

## Claim and Duplicate Prevention

One Forge claim lock covers the entire critical section:

1. acquire exclusive local ownership;
2. fetch the complete issue universe and current HEAD;
3. build the eligibility report and select one candidate;
4. re-fetch the selected issue;
5. re-run the same eligibility function;
6. replace `forge:ready` with `forge:working`;
7. verify the live labels;
8. post exactly one claim acknowledgement;
9. persist claim state;
10. release the selection lock only after the claim transition is established or safely aborted.

Concurrent scheduler ticks on the Forge host therefore cannot both select and acknowledge an issue. Live revalidation prevents a stale candidate from being claimed after its GitHub state changes. Cross-host Forge scheduling remains prohibited operationally; the existing conservative cross-host lock handling remains in place.

## Eligibility Report

Every scheduler run atomically writes `.hermes/forge/eligibility-report.json`. The report contains:

- schema version and run identifier;
- start and completion timestamps;
- maintenance cycle identifier;
- repository HEAD;
- configured current/controller issue numbers and approved ready labels;
- one entry for every inspected issue;
- normalized labels, dependencies, ordering fields, eligibility, and exact reasons;
- selected issue number or `null`;
- final scheduler outcome.

The console result includes the same report summary. When selection is empty, the user-facing message is exactly `No eligible issues found`, the scheduler exits without mutation, and the report records an idle outcome.

Reports use the existing sanitization and atomic JSON-write patterns. A discovery or runtime error still produces a report with the error outcome and sanitized evidence.

## Error Handling

- Ambiguous labels, dependencies, state, or processing history fail closed.
- A changed issue between selection and mutation returns a claim conflict and performs no label mutation.
- A label mutation that cannot be verified does not post a claim acknowledgement or start execution.
- Report-write failure is a runtime error and prevents a claim, because every run requires eligibility evidence.
- Existing claim-state recovery remains available, but recovery cannot bypass current eligibility checks.

## Validation Matrix

Tests will prove:

- closed issues are skipped;
- issue #4-style `forge:done + pm:review` state is skipped;
- issue #5-style terminal review state is skipped;
- `forge:done`, `forge:blocked`, and `pm:review` are independently terminal;
- issue #69 is blocked while its explicit PM dependency hold remains configured;
- issue #96 cannot select itself as controller or currently executing issue;
- unreleased issue #78 is skipped for missing explicit ready labels;
- unchanged HEAD and same-cycle processing are skipped;
- approved equivalents are disabled by default and work only when explicitly configured;
- dependency, priority, creation-date, and issue-number ordering is deterministic;
- two concurrent scheduler calls yield at most one claim mutation and one acknowledgement;
- every run writes a complete eligibility report with exact skip reasons;
- an empty run reports exactly `No eligible issues found`;
- the complete repository test suite and framework doctor pass.

## Repository Safety

Edits remain limited to Forge eligibility, reporting, trigger integration, focused tests, and required evidence. Existing unrelated changes in the original checkout remain unstaged and untouched. The implementation does not close, approve, release, or mutate issue #69 or any other live issue during testing.
