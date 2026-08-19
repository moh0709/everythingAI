# Atlas Atomic Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Atlas cron poller claim an eligible GitHub issue exactly once across concurrent machines, with verified state transitions and one durable acknowledgement.

**Architecture:** Use an issue-scoped GitHub Git ref (`refs/heads/atlas-claims/issue-<number>`) as the single compare-and-create claim authority. Only the process that creates that ref may re-read the issue, transition labels, and post the marker-bearing acknowledgement; failures either restore the pre-claim queue state and release the owned ref or retain the ref when ownership has already become durable.

**Tech Stack:** Python 3 standard library, GitHub REST API, Python `unittest`, Node.js test runner wrapper.

**Spec:** GitHub issue [#78](https://github.com/moh0709/everythingAI/issues/78)

## Global Constraints

- Preserve `pm:ready + atlas:ready + pm:approved-delegation` and the Atlas delegation body contract as eligibility requirements.
- Abort on `atlas:working`, `atlas:done`, `atlas:blocked`, `pm:review`, or any Forge/Hermes lifecycle label.
- A losing claimant must not mutate issue labels, comments, or repository files.
- Do not modify or release protected issue #69.
- Use only Python standard-library dependencies.

---

### Task 1: Executable Atlas claim regression suite

**Files:**
- Create: `tests/atlas_claim_test.py`
- Create: `tests/atlas-claim.test.mjs`
- Modify: `scripts/atlas-cron-poller.py`

**Interfaces:**
- Consumes: `claim_issue(issue, token, request=api_request, now=...)` from the poller module.
- Produces: regression evidence for concurrent claimants, stale discovery, repeated ticks, existing ownership, and partial API failure.

- [x] **Step 1: Write the failing tests**

  Add a thread-safe in-memory GitHub API harness. Assert that two concurrent calls produce one `CLAIMED`, one `CLAIM_CONFLICT`, one acknowledgement, and label mutations from only the winning thread. Add independent tests for a lost `atlas:ready` label after discovery, a second cron tick, pre-existing `atlas:working`, label-removal failure, and add-label failure with rollback.

- [x] **Step 2: Run the focused test and verify RED**

  Run: `node --test tests/atlas-claim.test.mjs`

  Expected: FAIL because `claim_issue` and the remote lock behavior do not exist.

- [x] **Step 3: Implement the minimal claim authority**

  In `scripts/atlas-cron-poller.py`, add:

  ```python
  CLAIM_RESULTS = {
      "CLAIMED", "CLAIM_CONFLICT", "NOT_RUNNABLE", "RUNTIME_ERROR"
  }

  def claim_ref(issue_number):
      return f"refs/heads/atlas-claims/issue-{issue_number}"

  def claim_issue(issue, token, request=api_request, now=None):
      # create the fixed remote ref; only its creator may continue
      # re-read the complete live issue and fail closed on stale labels
      # remove atlas:ready, verify, add atlas:working, verify
      # post one acknowledgement containing the fixed claim marker/ref
      # return a machine-readable result and evidence
  ```

  Make API errors explicit. On pre-ownership failure, release only the ref whose target still matches the acquired target. On add-label failure, restore `atlas:ready` only when no terminal/review/competing ownership appeared. If acknowledgement creation is ambiguous, query comments for the unique issue claim marker before deciding the result.

- [x] **Step 4: Run the focused test and verify GREEN**

  Run: `node --test tests/atlas-claim.test.mjs`

  Expected: all Atlas claim tests pass with zero failures.

- [x] **Step 5: Run queue-boundary regressions**

  Run: `node --test tests/agent-queue-policy.test.mjs tests/atlas-claim.test.mjs`

  Expected: Atlas remains fenced from Hermes and Forge queues, and all atomic-claim tests pass.

### Task 2: Repository evidence and canonical closeout

**Files:**
- Modify: `REPORTS/ATLAS_ATOMIC_CLAIM_ISSUE_78.md`
- Create: `docs/HANDOVER_2026-08-20_ATLAS_ATOMIC_CLAIM.json`
- Modify: `PROJECT_STATE.md`
- Modify: `AI_BOOTSTRAP.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: passing focused and full validation outputs plus the validated commit SHA.
- Produces: auditable issue #78 acceptance evidence and synchronized zero-open-issue state.

- [x] **Step 1: Run full verification**

  Run: `npm test`, `npm run framework:doctor`, `python3 -m py_compile scripts/atlas-cron-poller.py tests/atlas_claim_test.py`, `git diff --check`.

  Expected: zero test failures, Python compilation exit 0, and no whitespace errors. The framework doctor may report only the known missing-local-`gh` warning when connector-backed GitHub read/write capability is independently verified.

- [x] **Step 2: Record evidence**

  Write the exact commands/counts, acceptance-criterion mapping, durable lock design, rollback behavior, protected #69 confirmation, and validated SHA into the report and handover.

- [x] **Step 3: Synchronize canonical state**

  Replace references to #78 as future/unreleased with its accepted completion, record that no open implementation issues remain, and keep production/privileged-host/#69 gates unchanged.

- [x] **Step 4: Publish and verify CI**

  Publish the feature commit through a validation branch/PR, verify the exact commit in GitHub Actions, then update `main` only to the validated commit and re-read the resulting workflow and issue state.

- [ ] **Step 5: PM acceptance**

  Post concise evidence to #78 and close it as completed only after all acceptance criteria are verified. Re-query open issues and confirm #69 was not modified.
