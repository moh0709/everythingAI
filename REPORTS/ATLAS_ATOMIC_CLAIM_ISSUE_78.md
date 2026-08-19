# Issue #78 — Atlas Atomic Claim Acceptance

## Decision

`ACCEPTED_FOR_CLOSURE`

Issue #78 satisfies its repository acceptance criteria on implementation commit `74b5335b67c01d44b64321dae4a374b599586a05`. This decision does not activate Atlas, release any delegation, grant production access, or modify protected issue #69.

## Root cause

The previous poller performed two unconditional label mutations after a label read. There was no cross-machine mutual exclusion, mutation failures were ignored, verification checked only for `atlas:working`, and acknowledgement creation had no idempotency identity. Concurrent machines could therefore pass the same stale read and each post a claim.

## Accepted design

- A fixed issue-scoped Git ref, `refs/heads/atlas-claims/issue-<number>`, is created through GitHub's compare-and-create ref endpoint before any issue mutation.
- A `422` ref conflict is a normal losing-poller outcome; the loser does not touch labels, comments, or repository files.
- The winner re-reads the complete live issue immediately before mutation and rejects missing readiness, terminal/review state, or any competing Forge/Hermes ownership.
- `atlas:ready` removal and `atlas:working` addition are each verified. Safe pre-ownership failures restore readiness and release only the exact lock target owned by the caller; ambiguous ownership retains the durable lock and returns `RUNTIME_ERROR`.
- The acknowledgement uses the stable marker `<!-- atlas-claim:issue-<number> -->`. An ambiguous POST response is resolved by re-reading comments, avoiding a duplicate POST.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Two concurrent invocations produce one successful claim | PASS | Threaded API harness: one `CLAIMED`, one `CLAIM_CONFLICT` |
| Exactly one claim comment | PASS | Concurrent and ambiguous-response tests assert one marker-bearing comment |
| Losing poller changes no labels or files | PASS | Mutation owners set contains only the winning thread; remote ref conflict short-circuits |
| Existing ownership is never overwritten | PASS | Live stale-state test rejects `atlas:working` and releases the pre-mutation lock |
| Missing `atlas:ready` and terminal/review labels abort | PASS | Central eligibility block includes `atlas:working`, `atlas:done`, `atlas:blocked`, `pm:review`, and all Forge/Hermes lifecycle labels |
| Label removal failure is claim failure | PASS | Removal failure returns `RUNTIME_ERROR`, preserves ready state, posts no comment, and releases lock |
| Partial add-label failure is recoverable | PASS | Readiness rollback is verified before exact lock release |
| Repeated cron tick is idempotent | PASS | Second invocation returns `CLAIM_CONFLICT`; comment and mutation counts remain unchanged |
| Atlas/Hermes queue separation remains intact | PASS | Existing queue-policy suite remains green |

## Validation evidence

- RED: `node --test tests/atlas-claim.test.mjs` failed because `claim_issue` did not exist.
- GREEN: focused Atlas wrapper passed; its Python suite contains 7 passing cases.
- Queue boundary: `node --test tests/agent-queue-policy.test.mjs tests/atlas-claim.test.mjs` — 6 passed, 0 failed.
- Full root suite on the committed implementation — 191 passed, 0 failed, 0 skipped.
- Python source compilation — exit 0.
- `git diff --check` — exit 0.
- GitHub Actions run [#442](https://github.com/moh0709/everythingAI/actions/runs/32315159757) on exact commit `74b5335b67c01d44b64321dae4a374b599586a05` — backend tests, frontend typecheck/build, Client/Admin smoke, and disposable-folder acceptance all passed.
- Framework doctor: `WARN` only because the local `gh` executable is absent. GitHub repository read/write, issue, commit, branch, PR, workflow, and ref capabilities were independently exercised through the connected GitHub API.

## Rollback

Revert commit `74b5335b67c01d44b64321dae4a374b599586a05` to restore the prior poller. A successful issue lock is durable evidence and must not be deleted during rollback without re-reading the issue and proving no active Atlas ownership; unsafe or ambiguous cleanup must fail closed.

## Protected boundary

Issue #69 was not edited, relabeled, reopened, released, or otherwise modified by this work.
