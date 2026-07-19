---
name: hermes-pm-qa-first-pass
description: Mandatory pre-implementation, implementation, adversarial QA, evidence, and submission workflow for Hermes tasks in EverythingAI. Use before claiming PASS on any GitHub issue.
version: 1.0.0
owner: PM / ChatGPT
applies_to:
  - moh0709/everythingAI
  - Hermes autonomous issue execution
---

# Hermes PM/QA First-Pass Acceptance Workflow

## Purpose

This skill exists to reduce PM rejection cycles by requiring Hermes to act as engineer, adversarial QA reviewer, release engineer, and evidence auditor before claiming completion.

The goal is not merely to make the requested feature work. The goal is to produce a submission that survives independent PM review on the first pass.

A task is not complete because:

- the main feature works;
- unit tests pass;
- the happy path is demonstrated;
- a report says PASS;
- the issue has `hermes:done`.

A task is complete only when the implementation, production entry paths, failure behavior, concurrency behavior, evidence, artifacts, tests, and issue metadata all agree and satisfy the full acceptance contract.

## Mandatory use

Use this skill for every EverythingAI task before:

- changing code;
- designing tests;
- claiming `PASS`;
- applying `hermes:done`;
- applying `pm:review`;
- posting final evidence.

If this skill conflicts with a GitHub issue, PM correction comment, or later explicit instruction, the latest PM instruction has priority.

## Authority order

Use this precedence order:

1. Latest PM correction comment on the active GitHub issue.
2. Current issue body and acceptance criteria.
3. Repository operating manuals and architecture documents.
4. This skill.
5. Existing implementation patterns.

Never use an older report or handover to override a newer PM correction.

## Non-negotiable execution rules

- Work only on the active dependency-satisfied issue.
- Do not release or mutate later tasks.
- Do not claim PASS when any required evidence is missing.
- Do not convert ambiguous runtime state into success.
- Do not infer remote-host liveness from a local PID.
- Do not report mutations, removals, pushes, tests, or restarts unless independently observed.
- Do not treat a successful command return as proof that intended state changed; re-read and verify state.
- Do not let tests replace production-path verification.
- Do not create tests that reproduce test-only behavior while bypassing the real entry path.
- Do not manually manipulate live GitHub issues in automated tests.
- Do not expose credentials, tokens, environment values, private keys, or credential-bearing URLs.
- Do not perform destructive Git operations.

# Workflow

## Gate 0 — Load the full task contract

Before implementation:

1. Read the complete issue body.
2. Read every PM comment after the most recent Hermes PASS submission.
3. Identify the latest correction requirements.
4. Read all referenced source files, tests, manuals, reports, logs, and handovers.
5. Confirm the active branch, repository, working directory, and starting SHA.
6. Confirm the issue is actually claimed through the approved queue lifecycle.
7. List all explicit acceptance criteria.
8. Translate implied reliability requirements into testable conditions.

Create a private working checklist with these categories:

- functional behavior;
- production entry path;
- state transitions;
- concurrency;
- retries and limits;
- failure and rollback;
- persistence and restart;
- cross-host behavior;
- corruption handling;
- security and redaction;
- evidence integrity;
- documentation and artifacts.

Do not start coding until the checklist is complete.

## Gate 1 — Pre-mortem and likely PM rejection analysis

Assume the first submission will be rejected. Identify why.

For every task, answer:

1. What is the easiest happy-path implementation?
2. Why would that implementation be unsafe in production?
3. What happens when an operation partially succeeds?
4. What happens when a process crashes between two mutations?
5. What happens when the same event arrives twice?
6. What happens when two workers act concurrently?
7. What happens after restart with persisted state?
8. What happens when GitHub, filesystem, subprocess, or network calls report success but state does not change?
9. What happens when a file is malformed in the middle versus partially written at the end?
10. What happens when a lock belongs to another host?
11. What happens when cleanup fails?
12. What values could leak secrets even if key-name redaction exists?
13. Which test could pass while the production entry point remains broken?
14. Which report statement could be unsupported by the implementation?

Convert every identified risk into either:

- a production guard;
- a deterministic test;
- explicit documentation;
- a conservative manual-review outcome.

## Gate 2 — Design the acceptance matrix before coding

Create a test matrix before implementation.

Minimum matrix:

| Area | Required cases |
|---|---|
| Happy path | Expected input produces expected state and output |
| Boundary | Zero, one, maximum, above maximum, empty, malformed |
| Failure | Dependency throws, returns error, times out, returns stale data |
| Partial success | Mutation succeeds partially or returns success without state change |
| Concurrency | Two simultaneous callers; exactly one owner/mutation where required |
| Repetition | Duplicate and replayed events are idempotent |
| Persistence | Restart after saved state, stale state, corrupted state |
| Cleanup | Success and failure of lock/file/listener cleanup |
| Cross-host | Remote-host artifacts remain untouched without verifiable lease contract |
| Production entry | Real CLI/script/module boundary, not only imported functions |
| Security | Sensitive keys and sensitive values are redacted |
| Evidence | Test count, SHA, files, labels, and logs match reality |

For every acceptance criterion, identify at least one test or direct runtime proof.

If an acceptance criterion has no evidence mapping, implementation must not begin.

## Gate 3 — Implement the smallest safe production change

Implementation principles:

- Prefer one shared authority over duplicated logic.
- Keep ownership from claim through execution and cleanup.
- Use atomic operations for locks, state, and append/replace workflows.
- Re-read live state immediately before mutation when race conditions matter.
- Re-read live state after mutation and verify the exact intended result.
- Return machine-readable outcomes.
- Escalate ambiguous conditions instead of fabricating success.
- Record actions only after they actually succeed.
- Preserve prior logs and evidence.
- Use dependency injection for deterministic tests without changing production semantics.
- Ensure production CLI, poller, webhook, and worker entry points call the corrected implementation.

### Required post-mutation verification pattern

For any important external mutation:

1. Read current state.
2. Validate preconditions.
3. Perform mutation.
4. Re-read state from the source of truth.
5. Verify all additions, removals, ownership, and status changes.
6. If verification fails, return `RUNTIME_ERROR`, `CLAIM_CONFLICT`, or `MANUAL_REVIEW_REQUIRED` as appropriate.
7. Never report success merely because the mutation command exited successfully.

### Required cleanup pattern

For every acquired resource:

- identify the owner;
- keep the release handle through the full lifecycle;
- release in `finally` or equivalent known failure paths;
- verify cleanup when practical;
- do not record removal if removal failed;
- do not delete another active owner’s resource;
- detach event and signal handlers owned by the lifecycle.

## Gate 4 — Adversarial self-review before tests

After coding, inspect the diff as a hostile reviewer.

Ask:

- Can the production entry path still bypass this code?
- Is an async function being treated synchronously?
- Is a lock handle lost between classification and execution?
- Can two callers both pass discovery before claim?
- Can a positive jitter exceed the configured maximum?
- Can elapsed time exceed a total retry ceiling after restart?
- Can a generic `idempotent` flag incorrectly authorize a class-specific retry?
- Can malformed completed data be confused with a partial trailing write?
- Can a remote-host PID collide with a local PID?
- Can a failed GitHub read still lead to `RECOVERED` or PASS?
- Can a failed mutation still be recorded as successful?
- Can signal handlers retain stale ownership data?
- Can secrets appear inside values, URLs, headers, free text, or nested objects?
- Do reports claim behavior that tests do not prove?

If any answer is yes or uncertain, correct it before running the final suite.

## Gate 5 — Test production behavior, not only helpers

Tests must exercise the exact production boundary wherever possible.

Examples:

- Spawn the real CLI and verify output files, exit behavior, signals, and cleanup.
- Invoke the real webhook entry function through claim and execution.
- Run two concurrent deliveries and prove exactly one worker executes.
- Simulate GitHub edit success with unchanged labels and verify rejection.
- Simulate a cross-host lock using the current local PID and prove no cleanup occurs.
- Simulate filesystem deletion failure and prove no successful removal action is recorded.
- Simulate malformed JSON in the middle of a log and distinguish it from an incomplete trailing append.
- Simulate restart by constructing new instances against persisted state.

Tests that manually perform production responsibilities from the test harness do not prove the production path.

A test must fail against the known defective implementation and pass only after the real fix.

## Gate 6 — Required validation

Run every command required by the issue and PM correction.

Unless the issue says otherwise, run at minimum:

```bash
node scripts/framework-doctor.mjs
node --test tests/*.test.mjs
npm test
git diff --check
```

Also run:

- JSON parsing for every changed JSON artifact;
- direct CLI or runtime smoke tests for changed entry points;
- targeted tests for every PM rejection item;
- repository status and diff inspection;
- secret scanning of changed evidence where relevant.

Record exact commands, exact result counts, exit codes, and relevant output.

Do not say “all tests passed” without an exact count.

## Gate 7 — Evidence consistency audit

Before committing final artifacts, compare these against each other:

- actual Git diff;
- issue completion comment;
- report;
- handover JSON;
- terminal log;
- `.hermes/state.json`;
- test count;
- implementation SHA;
- artifact finalization SHA;
- final pushed SHA;
- current issue labels;
- repository cleanliness.

All must agree.

Check specifically:

- every claimed changed file exists in the diff;
- no changed file is omitted from evidence;
- test totals are consistent everywhere;
- artifact paths match the issue requirements exactly;
- dates and task IDs are correct;
- final SHA is immutable and pushed;
- no artifact still says “in progress,” “pending,” or references an older SHA;
- known limitations are explicit;
- no unsupported PASS language remains.

## Gate 8 — Simulated PM review

Before posting completion, perform a final independent review as if you are ChatGPT PM.

Use this decision standard:

### Reject if any of the following is true

- production entry path is not proven;
- failure behavior is ambiguous;
- mutation is not post-verified;
- cross-host state can be altered without a lease contract;
- concurrent duplicate execution is possible;
- cleanup ownership is unclear;
- corrupted data is silently discarded beyond an explicitly allowed partial trailing record;
- secrets can leak through values;
- tests only validate helpers;
- tests do not cover the PM correction;
- reports overstate evidence;
- final SHA or artifact metadata is inconsistent;
- live repository state is not clean and synchronized;
- required limitations are omitted.

### Acceptable to submit only when

- every issue acceptance criterion has evidence;
- every PM correction has code and regression coverage;
- production paths are exercised;
- adversarial cases are covered;
- evidence is consistent;
- no known blocker remains.

If self-review would reject, do not post PASS. Continue correcting.

## Gate 9 — Completion lifecycle

Only after all gates pass:

1. Commit implementation.
2. Run validation on the committed implementation.
3. Commit or finalize required artifacts.
4. Push all commits.
5. Confirm remote SHA.
6. Confirm repository is clean and synchronized.
7. Post final evidence to the issue.
8. Remove `hermes:working`.
9. Add `hermes:done` and `pm:review`.
10. Stop and wait for PM review.

Do not release the next issue yourself.

# Required final evidence format

Use a machine-readable JSON block in the final issue comment containing at least:

```json
{
  "task": "EAI-TASK-XXX",
  "issue": 0,
  "status": "PASS",
  "startingSha": "full-sha",
  "implementationSha": "full-sha",
  "artifactSha": "full-sha",
  "finalPushedSha": "full-sha",
  "filesChanged": [],
  "acceptanceCriteria": [
    {
      "criterion": "text",
      "evidence": ["test name", "file:path", "runtime proof"]
    }
  ],
  "pmCorrections": [
    {
      "requirement": "text",
      "implementation": "file and symbol",
      "regressionTest": "exact test name"
    }
  ],
  "validation": {
    "frameworkDoctor": "PASS",
    "nodeTests": "N/N PASS",
    "npmTest": "N/N PASS",
    "diffCheck": "PASS",
    "jsonChecks": "PASS",
    "productionSmoke": "PASS"
  },
  "adversarialCases": [],
  "knownLimitations": [],
  "repositoryClean": true,
  "remoteSynchronized": true,
  "nextRecommendedTask": "EAI-TASK-YYY"
}
```

Do not use placeholders in the published evidence.

# Task-specific adversarial prompts

## Claiming and concurrency

- Can discovery and claim race?
- Is ownership held through execution?
- Is the lock released on success, failure, exception, and signal?
- Can poller and webhook execute the same issue?
- Is live state verified before and after label mutation?

## Supervisor and lifecycle

- Does the real CLI await startup?
- Does the process remain alive?
- Are heartbeat writes atomic?
- Do SIGTERM and SIGINT write final state and release locks?
- Are listeners detached?
- Can a fresh instance start after shutdown?

## Crash recovery

- Is remote-host state always conservative?
- Can local PID coincidence affect remote state?
- Is GitHub unavailable treated as success?
- Are ambiguous combinations escalated?
- Are removals truthfully recorded?

## Retry systems

- Are per-attempt and total elapsed ceilings enforced after persistence/restart?
- Is jitter bounded by the configured maximum?
- Are error classes gated by class-specific revalidation?
- Is retry state cleared after success?
- What happens when persistence fails or collides?

## Event logs and history

- Are writes append-safe and rotation-safe?
- Is only a truly partial trailing record tolerated?
- Does malformed completed data trigger corruption handling?
- Does rotation failure preserve the original log?
- Are sensitive keys and sensitive values redacted?
- Are bearer tokens, private keys, cookies, authorization headers, query credentials, and user-info URLs covered?

# STOP conditions

Stop and return `BLOCKED` instead of PASS when:

- required repository or server access is unavailable;
- a required command cannot run;
- a pushed SHA cannot be verified;
- GitHub live state cannot be read when acceptance requires it;
- a PM correction is unclear or contradictory;
- a safety property cannot be deterministically tested;
- evidence cannot be made internally consistent.

A BLOCKED result must include:

- exact failing command or access point;
- exact error;
- work completed;
- work not completed;
- safest next action;
- no PASS claim.

# Definition of done

The definition of done is:

> The feature works through the real production path; expected failures are conservative and machine-readable; concurrency, restart, corruption, cleanup, cross-host, and security edge cases are tested where relevant; all external mutations are verified; all artifacts match the actual repository state; and an adversarial self-review finds no credible PM rejection reason.
