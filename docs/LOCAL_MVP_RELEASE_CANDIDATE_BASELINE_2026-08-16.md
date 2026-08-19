# EverythingAI — Local MVP Release-Candidate Baseline

**Defined:** 2026-08-16  
**Repository:** `moh0709/everythingAI`  
**Branch:** `main`  
**Status:** `RC_PASS` (2026-08-20; candidate `b89e91a2a362914a0c71f60be95725acb8363aff`)
**Authority:** `docs/PHASE0_RECONCILIATION_BASELINE_2026-08-14.md`

## 1. Purpose

This document defines the exact scope and acceptance evidence required to call the current EverythingAI local-first product a release candidate.

It does not claim that the release candidate already passes. Historical test counts, completion comments, and implementation commits are evidence inputs only. Final acceptance requires a fresh validation run against one recorded commit SHA.

## 2. Product boundary

The release candidate is the local-first EverythingAI application composed of:

- Backend API and local persistence in `services/api`.
- React Client Workspace and Admin Dashboard in `apps/everything-ai-ui`.
- Client Workspace at `http://localhost:5151`.
- Admin Dashboard at `http://localhost:5151/admin.html`.
- Backend API at `http://127.0.0.1:4100`.
- Local SQLite-backed indexing, extraction, search, knowledge, planning, safe action, recovery, and audit flows.

The release candidate is not the future enterprise production platform.

## 3. In-scope user outcomes

A user must be able to:

1. Add or select a disposable local source folder.
2. Index supported files and observe understandable progress/results.
3. Extract supported document content and receive explicit unsupported/failure states.
4. Search indexed files and open source-backed document context.
5. Build and inspect source-backed Knowledge Base pages with traceable references.
6. Ask a question through the backend/admin-selected AI provider and receive either a grounded answer or a clear provider/configuration state.
7. Review an organization plan without immediate filesystem mutation.
8. Preview supported move/rename actions and see blocked-action reasons.
9. Explicitly approve and execute only supported safe actions.
10. Inspect audit history.
11. Undo or restore supported filesystem actions where the product says recovery is available.
12. Use the Client Workspace without exposure to provider secrets, agent connector settings, or arbitrary command execution.
13. Use the Admin Dashboard to manage operational settings and diagnostics within documented safety boundaries.

## 4. Explicit non-goals

The following are outside this release-candidate scope:

- Multi-user authentication and authorization.
- Tenant/workspace isolation.
- Central PostgreSQL or production vector infrastructure.
- SaaS or internet-facing production deployment.
- Windows installer or automatic updater.
- Production object storage.
- Production-grade background job platform.
- Privileged host provisioning.
- Automatic deletion or permanent purge.
- Arbitrary browser-submitted shell commands.
- Hard governance enforcement beyond accepted, explicitly enabled controls.
- Atlas execution.
- Optional external integrations that are not configured and independently validated.

## 5. Acceptance matrix

| ID | Requirement | Validation | Required evidence | Gate |
|---|---|---|---|---|
| RC-GOV-01 | Exact candidate SHA recorded | `git rev-parse HEAD` and remote comparison | Commit SHA and branch | Required |
| RC-GOV-02 | Canonical state agrees | Review `PROJECT_STATE.md`, `AI_BOOTSTRAP.md`, both roadmaps, and Phase 0 baseline | No unresolved authority conflict | Required |
| RC-GOV-03 | Execution ownership is explicit | Review CEO decision, #105 disposition, #106 scope, and queue labels | ChatGPT direct execution recorded; #105 truthfully closed not planned; no competing worker claim | Required |
| RC-GOV-04 | Protected work remains protected | Inspect #69 and unreleased queues | #69 unchanged; no unauthorized queue labels | Required |
| RC-BLD-01 | Framework integrity passes | `npm run framework:doctor` | Exit 0 | Required |
| RC-BLD-02 | Root reliability tests pass | `npm test` from repository root | Exit 0 and exact pass/fail counts | Required |
| RC-BLD-03 | Backend tests pass | `npm ci && npm test` in `services/api` | Exit 0 and exact pass/fail counts | Required |
| RC-BLD-04 | Frontend typecheck passes | `npm ci && npm run typecheck` in `apps/everything-ai-ui` | Exit 0 | Required |
| RC-BLD-05 | Frontend production build passes | `npm run build` in `apps/everything-ai-ui` | Exit 0 and generated build | Required |
| RC-CI-01 | CI smoke workflow passes on candidate SHA | GitHub Actions `.github/workflows/ci-smoke.yml` | Green backend, frontend, and Playwright jobs | Required |
| RC-UI-01 | Client and Admin surfaces load | Playwright plus manual smoke | No blocking console/runtime error | Required |
| RC-INT-01 | Disposable-folder intake completes | Manual test using `docs/MVP_UI_SMOKE_TEST_RUNBOOK.md` | Indexed files and scan summary | Required |
| RC-EXT-01 | Supported extraction works | Use TXT, MD, and at least one supported document type | Extracted content and source reference | Required |
| RC-EXT-02 | Unsupported/failing extraction is explicit | Add one unsupported or intentionally invalid fixture | Clear non-destructive failure state | Required |
| RC-SRCH-01 | Keyword/context search works | Search known fixture phrase and open result | Correct file, metadata, context, and extracted text | Required |
| RC-KNOW-01 | Knowledge page is source-backed | Build/open a Knowledge Base page | Citations/source chunks resolve to indexed source | Required |
| RC-ASK-01 | Ask AI degrades safely | Test configured provider or documented unconfigured state | Grounded response with sources or clear configuration message | Required |
| RC-PLAN-01 | Plan generation is non-mutating | Generate organization suggestions | No filesystem mutation before approval | Required |
| RC-ACT-01 | Preview and approval gate work | Preview supported move/rename | Before/after target and explicit approval requirement | Required |
| RC-ACT-02 | Supported action executes safely | Execute approved action in disposable folder | Correct mutation and audit entry | Required |
| RC-REC-01 | Undo/restore works where advertised | Undo or restore the disposable action | Restored file and audit evidence | Required |
| RC-SAFE-01 | Delete and permanent purge remain blocked | Attempt through UI/API boundary | Explicit rejection; no file deletion | Required |
| RC-SAFE-02 | Path boundaries resist escape | Target traversal/out-of-root cases | Rejected request and no mutation | Required |
| RC-SAFE-03 | Client cannot override provider or access secrets | API/UI boundary tests | Provider control remains Admin/backend-only | Required |
| RC-SAFE-04 | Agent connectors remain Admin-only and disabled by default | UI and backend configuration check | No Client exposure or arbitrary command path | Required |
| RC-AUD-01 | Audit evidence is reviewable | Inspect success and failure events | Actor/action/result/entity/timestamp context | Required |
| RC-DOC-01 | Setup and limitations match behavior | Review README, smoke runbook, and known limitations | No stale test counts or false production-readiness claims | Required |
| RC-ROLL-01 | Test data and candidate changes are reversible | Follow disposable-folder cleanup and repository rollback notes | Cleanup/rollback instructions validated | Required |

## 6. Required validation sequence

Run against one unchanged candidate SHA.

### Repository root

```bash
git pull --ff-only
git rev-parse HEAD
npm run framework:doctor
npm test
git diff --check
```

### Backend

```bash
cd services/api
npm ci
npm test
```

### Frontend

```bash
cd apps/everything-ai-ui
npm ci
npm run typecheck
npm run build
npx playwright test smoke/client-admin-smoke.spec.ts
```

### Manual product validation

Follow `docs/MVP_UI_SMOKE_TEST_RUNBOOK.md` using only a disposable folder. Extend the run to cover plan preview, explicit approval, move/rename execution, audit inspection, undo/restore, delete rejection, purge rejection, and path-boundary rejection.

## 7. Required evidence package

Create these artifacts for the candidate SHA:

- `REPORTS/LOCAL_MVP_RELEASE_CANDIDATE_VALIDATION.md`
- `REPORTS/LOCAL_MVP_RELEASE_CANDIDATE_ACCEPTANCE_MATRIX.json`
- `LOGS/LOCAL_MVP_RELEASE_CANDIDATE-terminal.log`
- `docs/HANDOVER_<DATE>_LOCAL_MVP_RELEASE_CANDIDATE.json`
- GitHub issue comment containing exact SHA, test counts, CI links, manual smoke result, limitations, and final decision.

Evidence must be sanitized and must not include API keys, tokens, raw environment files, personal documents, or production filesystem paths.

## 8. Decision rules

### `RC_PASS`

All required gates pass on the same candidate SHA; evidence agrees; no critical safety defect or unresolved authority conflict exists.

### `RC_PARTIAL`

Core application works, but one or more required gates lack evidence or a non-critical release blocker remains. The major-feature freeze stays active.

### `RC_FAIL`

A required build/test fails, a core workflow fails, evidence conflicts materially, or a safety boundary is violated. The major-feature freeze stays active and only narrowly scoped remediation may be released.

## 9. Freeze-lift rule

Defining this baseline did not itself lift the temporary major-feature freeze.

The freeze was lifted on 2026-08-20 after:

1. #105 is truthfully dispositioned without claiming the missing Forge soak passed;
2. execution ownership remains explicit and non-overlapping;
3. this matrix is executed against one candidate SHA;
4. the result is `RC_PASS`; and
5. ChatGPT records the PM release decision.

## 10. Immediate next work

1. Preserve CI Smoke #438 and the disposable-folder Playwright sequence as regression evidence.
2. Keep enterprise production-readiness gaps separate from the accepted local MVP.
3. Resume bounded, dependency-ordered work across the five tracks.

## 11. Current validation result

Candidate `b89e91a2a362914a0c71f60be95725acb8363aff` passed root reliability tests (190/190), backend CI tests (177 total; 176 passed; 1 skipped), frontend typecheck, frontend production build, five Client/Admin Playwright smoke tests, and the disposable-folder end-to-end acceptance sequence. GitHub Actions CI Smoke #438 completed successfully.

The result is `RC_PASS`. The acceptance run also exposed and repaired a real `/api/files` contract defect: extraction state was persisted but omitted from file listings. A regression test failed before the fix and passed with the complete candidate. Full evidence is in `REPORTS/LOCAL_MVP_RELEASE_CANDIDATE_VALIDATION.md` and `REPORTS/LOCAL_MVP_RELEASE_CANDIDATE_ACCEPTANCE_MATRIX.json`.
