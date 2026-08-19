# Local MVP Release-Candidate Validation

**Decision:** `RC_PASS`

**Candidate:** `b89e91a2a362914a0c71f60be95725acb8363aff`

**Branch:** `main`

**Validation date:** 2026-08-20

**Issue:** #106

## Outcome

Every required local MVP release-candidate gate passed on one unchanged candidate. The temporary major-feature freeze is lifted. This decision accepts the local MVP boundary only; it does not claim enterprise production readiness.

## Validation evidence

- Framework doctor exited successfully and found every required framework artifact. It reported only the known local `gh` authentication warning; repository and workflow access was independently verified through the connected GitHub application.
- Root reliability suite: 190 passed, 0 failed, 0 skipped.
- Backend CI suite: 177 tests; 176 passed, 1 skipped, 0 failed.
- Frontend TypeScript typecheck: passed.
- Frontend production build: passed.
- Playwright Client/Admin smoke: 5 passed, 0 failed.
- Disposable-folder Playwright acceptance: passed.
- Final workflow: [EverythingAI CI Smoke #438](https://github.com/moh0709/everythingAI/actions/runs/32309409263); backend, frontend, and Playwright jobs all passed.
- Exact validated head `b89e91a2a362914a0c71f60be95725acb8363aff` was fast-forwarded to `main` before this evidence-only synchronization.

## Disposable-folder acceptance

The automated browser/API sequence created fresh temporary folders and disposable TXT, Markdown, CSV, and intentionally invalid PDF fixtures. It verified:

1. Client Workspace folder intake and indexing.
2. Supported extraction plus explicit invalid-document failure state.
3. Search and extracted document context.
4. Source-backed Knowledge Base pages and evidence chunks.
5. Safe Ask AI degradation when no provider answer is available.
6. Non-mutating planning before approval.
7. Preview and explicit approval gating.
8. Denied execution without mutation.
9. Approved move with actor/request audit identity.
10. Undo restoring original content and location.
11. Out-of-root path rejection without mutation.
12. Trash, permanent-purge denial, and restore.
13. Client/Admin separation.
14. Cleanup of all disposable runtime folders.

## Defect found and repaired during acceptance

CI Smoke #436 exposed a real API contract defect: extraction state was persisted but `/api/files` omitted it, causing the Client Workspace to report zero extracted files and preventing the acceptance assertion from observing the state.

A focused regression test was added first. CI Smoke #437 failed on that test with expected `undefined` extraction state. The minimal repair joined persisted extraction metadata into `listIndexedFiles`; CI Smoke #438 then passed the regression and the full disposable-folder sequence.

The acceptance work also preserves defense-in-depth path validation: previews and execution reject explicit move targets outside the indexed source root.

## Governance and safety disposition

- Issue reconciliation is complete for the Phase 0/local-MVP scope.
- Execution ownership is explicit: ChatGPT is the direct executor and sole PM/release authority for this decision; Forge is not a dependency.
- Issue #69 remained protected and unchanged.
- Permanent purge remains denied.
- No provider secret, raw environment value, personal document, arbitrary command path, or production filesystem path appears in the evidence.
- Issue #78 remains a separately scoped, unreleased autonomous-delivery task and does not invalidate the local MVP decision.

## Release decision

`RC_PASS` is accepted for the local MVP. Issues #106 and #3 may be closed as completed. The temporary major-feature freeze is lifted; future enterprise-platform, privileged-host, production-security, and protected-issue work remains subject to its own gates.

Validation PR #108 was used to obtain independent CI evidence. Advancing `main` to the exact validated head caused GitHub to mark the PR merged without creating a separate merge commit.
