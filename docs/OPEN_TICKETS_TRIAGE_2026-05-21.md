# Open Tickets Triage

Date: 2026-05-21

## Context

After the Windows local MVP validation pass, the open GitHub issues were reviewed against the current validated repo state.

Validated baseline:

```text
Windows local UI smoke test: PASS
Backend tests: 81/81 PASS
Frontend typecheck: PASS
Frontend production build: PASS
Phase 5 Safety hardening: complete / validated
```

## PM decision

The open tickets should not all be treated the same.

They fall into three groups:

1. Completed / closable MVP stabilization tickets
2. Open local MVP finalization tickets with remaining work
3. Deferred enterprise/full-system governance tracks

## Issue triage

| Issue | Title | PM status | Decision |
|---:|---|---|---|
| #2 | Stabilize local MVP before next feature expansion | Completed by current baseline | Close after adding validation comment |
| #3 | Finalize and optimize local MVP | Partially complete | Keep open as umbrella until Phase 2/3/4/6 remaining items are closed |
| #4 | Make Organizor-style UI the main local MVP app | Superseded by current official React user UI direction | Mark superseded/deferred, do not implement as-is |
| #5 | Fix remaining fake/static UI elements in EverythingAI React UI | Needs re-evaluation against current `UserApp.tsx` and admin UI split | Keep open until verified or narrowed |
| #6-#13 | Phase 5.x governance tracks | Full-system / enterprise governance, not local MVP | Keep open/deferred; do not close as MVP work |
| #19 | Sprint 6: MVP UI Workflow Completion | Partly superseded by official React User UI and current local UI smoke pass | Re-triage and narrow to remaining real UI gaps |

## Immediate PM actions

### Close now

- #2 can be closed because its definition of done is satisfied by:
  - modular routes
  - route validation/helper work
  - local MVP documentation
  - Windows smoke test guide
  - nested undo regression test
  - `npm test` 81/81 pass

### Keep open

- #3 remains the umbrella local MVP finalization issue.
- #5 remains open until fake/static UI references are checked against the current official UI split.
- #19 remains open but should be rewritten/narrowed because several Sprint 6 items refer to older `services/api/public` UI flows.

### Defer

- #4 is not the current direction because the official safe user UI is now the React app at `apps/everything-ai-ui` / `UserApp.tsx`.
- #6-#13 are enterprise governance/full-system tracks and are outside the local MVP baseline.

## Next PM implementation order

1. Close Issue #2 with validation evidence.
2. Add a comment to Issue #3 with the current 81/81 and local UI smoke baseline.
3. Add a comment to Issue #19 explaining that the old public UI sprint must be re-triaged against the official React User UI.
4. Re-evaluate Issue #5 against the current codebase before changing UI.
5. Continue local MVP finalization in this order:
   - Phase 2 scanner: persisted unchanged-file skip strategy
   - Phase 3 watcher: Windows stress test / UI status
   - Phase 4 extraction/embedding: unchanged extracted-text embedding skip
   - Phase 6: only controlled UserApp modularization when runtime risk is low

## Governance note

Governance tickets #6-#13 should not be closed during local MVP finalization. They belong to the full-system / enterprise governance track and require separate governance continuity validation.
