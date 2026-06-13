# SECURITY AND FILE SAFETY

## Core principle

EverythingApp must never perform destructive file operations without explicit user approval.

## Safety rules

1. All actions must be previewed before execution.
2. All actions must be logged.
3. All actions must be reversible where possible.
4. Delete actions require double confirmation.
5. Bulk actions must show grouped preview.

## Undo system

Before executing any action, store:

- original path
- original filename
- timestamp
- action id

This allows full rollback.

## Risk levels

- Low: tagging, categorization
- Medium: rename, move
- High: delete

## Permission model (future)

- Admin
- Editor
- Viewer

## Local-first security

- No data leaves the system unless explicitly configured.
- Support local LLMs.

## Phase 8.2 CI and Agent Connector safety invariants

EverythingAI Phase 8.2 completed CI smoke-test integration without changing the local MVP security model.

Current preserved invariants:

```text
Client Workspace and Admin Dashboard remain separate.
Provider configuration remains Admin-only.
Agent Connectors remain Admin-only.
Client Workspace must not expose provider selection, API keys, or Agent Connector settings.
Agent bridge execution remains disabled by default.
Agent chat execution remains disabled by default.
Arbitrary shell command execution remains blocked.
Trust score calculations remain unchanged.
Quality score calculations remain unchanged.
Human validation governance remains unchanged.
Wiki diagnostics remain unchanged.
Evidence engine remains unchanged.
```

CI smoke-test coverage documents the same safety boundary:

```text
Backend: services/api -> npm ci, npm test
Frontend: apps/everything-ai-ui -> npm ci, npm run typecheck, npm run build
Playwright: apps/everything-ai-ui -> smoke/client-admin-smoke.spec.ts
Artifacts: playwright-report, test-results
```

The CI pipeline is a validation gate for the current local MVP. It is not production authorization, tenant isolation, or enterprise release readiness.
