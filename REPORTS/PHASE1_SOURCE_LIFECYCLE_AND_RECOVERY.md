# Phase 1 Source Lifecycle and Recovery

Date: 2026-08-21

Issue: [#113](https://github.com/moh0709/everythingAI/issues/113)

Pull request: [#118](https://github.com/moh0709/everythingAI/pull/118)

Baseline: `02612d76f33af309ba2030239c7a38883cd91d4b`

Validated implementation SHA: `b612f0c227759da63bea3d05d0564d02db4ec79d`

## Result

Client and Admin file explorers now derive one authoritative source-processing lifecycle instead of presenting derived progress, stage, raw index status, and raw extraction status as four equal-weight labels.

Filename selection and recovery are keyboard-operable with native buttons. Recovery moves focus to the destination source-root heading. Client lifecycle details accept both the file-list `error_message` field and the document-context `index_error_message` field. The Admin explorer contains its table at narrow widths and labels the lifecycle column accurately.

## Lifecycle precedence

| Precedence | State | User label | Recovery |
|---:|---|---|---|
| 1 | `index_failed` | Index failed | Open existing source-root controls |
| 2 | `extraction_failed` | Extraction failed | Open existing source-root controls |
| 3 | `unsupported` | Ready without text | No retry; conversion guidance only |
| 4 | `ready` | Ready | None |
| 5 | `extracting` | Extracting text | None |
| 6 | `indexing` | Indexing | None |
| 7 | `intake` | Waiting for intake | None |

The precedence is deterministic even when backend records conflict. For example, `index_status=failed` plus `extraction_status=extracted` remains `index_failed`.

## Recovery boundary

The backend supports safe source-root re-scan through the existing source controls. It does not expose a safe per-file retry endpoint. Therefore:

- `recoveryAction` remains `null` for file-level actions;
- failed records expose `recoveryTarget=source_root`;
- the native **Open source recovery** button navigates Client users to setup/source controls and Admin users to the dashboard source controls;
- the button is keyboard focusable, Enter-activatable, and linked to explanatory text with `aria-describedby`;
- no fictitious per-file retry request is sent.

## Evidence

- Lifecycle matrix and integration unit tests: 4/4 passed.
- Frontend TypeScript check: passed.
- Frontend production build: passed.
- Root regression: 191/191 passed.
- Independent code review: no Critical, Important, or Minor findings after fixes.
- [CI #474](https://github.com/moh0709/everythingAI/actions/runs/32477924034): passed on validated implementation SHA `b612f0c227759da63bea3d05d0564d02db4ec79d`.
  - Frontend typecheck and production build: passed.
  - Backend tests: passed.
  - Client/Admin Playwright smoke: 9/9 passed.
  - Disposable-folder release-candidate acceptance: 1/1 passed.
- Responsive artifacts produced by CI:
  - `phase1-desktop-client-source-recovery.png`
  - `phase1-narrow-client-source-recovery.png`
  - `phase1-desktop-admin-source-recovery.png`
  - `phase1-narrow-admin-source-recovery.png`

## Safety and rollback

- No filesystem mutation or retry endpoint was added.
- Existing raw index/extraction values remain visible as secondary technical detail.
- Protected issue #69 and its implementation remain unchanged.
- Rollback after merge: run `git revert <PR-118-merge-commit-sha>`, then rerun the root regression, frontend typecheck/build, and Playwright CI gates before pushing the revert.
