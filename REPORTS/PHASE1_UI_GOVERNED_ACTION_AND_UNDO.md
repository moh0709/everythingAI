# Phase 1 — UI-Governed Action and Undo Acceptance

Date: 2026-08-21  
Issue: #114  
Baseline: `2e0c41ac7c0eee4615e06abd4e256e1ca56261b5`  
Status: IMPLEMENTED — CI/independent review pending

## Scope

This milestone extends the current Admin UI and Playwright acceptance surface so the governed filesystem lifecycle is visible and testable through the product UI:

`planning → dry-run preview → explicit approval → execution → audit → undo → restored filesystem`

No connector runtime behavior, production deployment behavior, authentication, tenancy, or protected issue #69 is changed.

## Acceptance mapping

| Criterion | Implementation / evidence | Status |
|---|---|---|
| Disposable deterministic fixture | `smoke/ui-governed-action-undo.spec.ts` creates one temporary source root and deterministic invoice fixture | implemented |
| Initial/final filesystem equality | Recursive relative-path + SHA-256 manifest comparison | implemented |
| Preview before mutation | Admin Planning UI selects one move suggestion and renders source, target, and ready status before execution | implemented |
| Explicit approval | Playwright asserts the browser confirmation description before accepting | implemented |
| Execution evidence | Admin UI execution status plus changed manifest | implemented |
| Audit evidence | Analytics audit row is tied to the action execution entity ID and exposes actor identity | implemented |
| Undo through UI | Analytics Governed Action History exposes Undo only for `executed` actions and requires confirmation | implemented |
| Restored filesystem | Final manifest equals initial manifest and original file content is exact | implemented |
| Failure preservation | Failed test keeps the disposable folder and writes its path/status into the uploaded smoke artifact directory | implemented |
| CI artifacts | Existing backend/frontend logs and Playwright reports/results remain `if: always()`; governed-action screenshots use the same artifact directory | implemented |
| Full release gates | Backend tests, frontend typecheck/build, Client/Admin smoke, disposable RC acceptance, and new governed-action test run in CI | pending CI |
| Root 191/191 | Required before acceptance | pending execution evidence |
| Independent review | Required before acceptance | pending |
| Protected #69 unchanged | No #69 mutation is part of this branch | preserved |

## Changed paths

- `.github/workflows/ci-smoke.yml`
- `apps/everything-ai-ui/src/admin/components/PlanningView.tsx`
- `apps/everything-ai-ui/src/admin/components/AnalyticsView.tsx`
- `apps/everything-ai-ui/src/admin/components/AdminViewRouter.tsx`
- `apps/everything-ai-ui/smoke/ui-governed-action-undo.spec.ts`
- `REPORTS/PHASE1_UI_GOVERNED_ACTION_AND_UNDO.md`

## Product behavior

Planning now exposes stable source/action semantics and renders both source and target paths in the dry-run queue. Analytics now contains a governed action history backed by `GET /api/action-executions`, and eligible executed actions expose a visible Undo control backed by the existing guarded undo endpoint. Undo requires an explicit browser confirmation.

The implementation reuses existing backend safety contracts. It does not invent a new execution or recovery API.

## Failure and rollback

On Playwright failure, CI still uploads backend logs, frontend logs, Playwright report, test results, screenshots, and the failure pointer. The disposable fixture is intentionally not deleted on failure so the failing runner can inspect it during the job.

Rollback this milestone by reverting its eventual merge commit. No earlier Phase 1 merge needs to be reverted unless independent evidence proves a dependency regression.

## Acceptance gate

Do not mark #114 complete until:

1. CI is green on the PR head;
2. root regression is confirmed 191/191;
3. the new Playwright acceptance passes;
4. independent diff review has no unresolved Critical/Important findings;
5. the merge SHA and CI URL are recorded here and on #114;
6. protected issue #69 remains unchanged.
