# Admin Agent Connectors Validation

Date: 2026-06-07

Related handover:

- `docs/HANDOVER_2026-06-07_ADMIN_AGENT_CONNECTORS_PROGRESS.json`

Milestone:

- Admin Agent Connectors
- Client chat provider hardening

Validation result:

- Overall: passed

Backend validation:

- Working directory: `services/api`
- Command: `npm test`
- Result: passed
- Evidence reported by user:
  - tests: 106
  - pass: 106
  - fail: 0
  - cancelled: 0
  - skipped: 0
  - todo: 0
  - duration_ms: 5135.4197

Frontend validation:

- Working directory: `apps/everything-ai-ui`
- Command: `npm run typecheck`
- Result: passed
- Evidence reported by user: `tsc --noEmit` completed without errors.

Frontend build validation:

- Working directory: `apps/everything-ai-ui`
- Command: `npm run build`
- Result: passed
- Evidence reported by user:
  - Vite build completed successfully.
  - 1545 modules transformed.
  - Build completed in 2.11 seconds.

Playwright smoke-test validation:

- Working directory: `apps/everything-ai-ui`
- Command: `npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed`
- Result: passed
- Evidence reported by user:
  - 4 tests run
  - 4 tests passed
  - 0 tests failed
  - duration: 8.9 seconds

Validated behavior:

- Client Workspace still exposes Home, Sources & Files, Knowledge Base, and Ask AI.
- Client Workspace does not expose AI Provider Configuration.
- Client Workspace does not expose Admin Agent Connectors.
- Client Ask AI keeps the latest message visible after submit.
- Admin Dashboard exposes AI Provider Configuration.
- Admin Dashboard exposes Admin Agent Connectors.
- Admin Settings exposes Codex, Claude Code, and OpenCode connector coverage through stable connector descriptions.
- Backend `/api/chat` no longer accepts request-body provider override and therefore follows the admin-selected backend provider.

Preserved safety invariants:

- Provider/API-key configuration remains admin-side only.
- Normal Client Workspace users chat only through the AI provider selected by Admin/backend.
- Agent connectors remain admin-only.
- Agent bridge execution remains disabled by default unless explicitly enabled with backend environment flags.
- Browser clients cannot submit arbitrary shell commands.
- No trust-score or quality-score logic changed.
- No file execution behavior changed.

Current status:

- Admin Agent Connectors are implemented and validated.
- Client chat provider hardening is implemented and validated.

Recommended next action:

- Create the next consolidated handover report marking Local MVP smoke test plus Admin Agent Connectors as validated, then proceed to controlled connector-specific setup/testing or CI smoke-test integration.
