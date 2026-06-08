# Local Smoke Test Validation

Date: 2026-06-07

Status: reconstructed/restored validation artifact

This file restores the root-level validation artifact referenced by the current EverythingAI documentation and handover chain.

The underlying historical smoke-test evidence was committed as:

```text
services/api/docs/SMOKE_TEST_REPORT_2026-06-07.md
```

Historical source commit:

```text
5aaddd2c982802312dbc0ef3b169848cb05f937f
Add smoke test report for EverythingAI on 2026-06-07
```

The historical report was later visible in repository history under commit:

```text
7b41f31630af51f47e08b5b1e0ad9c9c2bb444bb
```

## Scope

This validation records the local Windows smoke-test result for the validated EverythingAI local MVP baseline.

Validated areas:

- Repository preflight
- Backend dependency readiness
- Frontend dependency readiness
- Backend automated tests
- Frontend TypeScript typecheck
- Frontend production build
- Backend service startup
- Frontend service startup
- Client Workspace loading
- Admin Dashboard loading
- Playwright Client/Admin smoke test
- Client/Admin separation
- Sources & Files vs Knowledge Base distinction
- Ask AI auto-scroll behavior
- Provider configuration Admin-only behavior

## Repository status

Historical report evidence:

```text
Repo Root: C:\temp\EverythingAI
Branch: main
Git status: clean
```

## Commands validated

Backend tests:

```powershell
cd C:\temp\EverythingAI\services\api
npm test
```

Frontend typecheck:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
```

Frontend build:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run build
```

Playwright smoke test:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

## Validation results

| Area | Result | Evidence |
|---|---:|---|
| Backend tests | Passed | 106/106 tests passed |
| Frontend typecheck | Passed | 0 TypeScript errors |
| Frontend build | Passed | Production build successful |
| Backend service | Passed | API running on port 4100 |
| Frontend service | Passed | Vite running on port 5151 |
| Client Workspace | Passed | `CLIENT WORKSPACE` label visible |
| Admin Dashboard | Passed | `ADMIN DASHBOARD` label visible |
| Playwright smoke test | Passed | 4/4 tests passed |
| Screenshots | Passed | 8/8 generated |
| Client/Admin separation | Passed | Visual and functional separation confirmed |
| Sources vs Knowledge Base distinction | Passed | Clear labels and descriptions confirmed |
| Ask AI auto-scroll | Passed | Latest message remained visible after submit |
| Provider settings Admin-only | Passed | Client Workspace did not expose provider configuration |

## Playwright smoke-test details

Historical Playwright command:

```powershell
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

Historical result:

```text
Tests executed: 4
Tests passed:   4
Tests failed:   0
Duration:       9.2 seconds
Browser:        Chromium headed mode
```

Covered tests:

1. Client workspace clearly separates sources, files, knowledge base, and Ask AI.
2. Client Ask AI keeps the latest message visible after submit.
3. Admin Dashboard is clearly separated from Client Workspace.
4. Backend API is reachable for real smoke testing.

## Smoke-test screenshots

Historical screenshot artifact path:

```text
apps/everything-ai-ui/test-results/everythingai-smoke/
```

Historical screenshots generated:

```text
01-client-home.png
02-client-sources-files.png
03-client-knowledge-base.png
04-client-ask-ai.png
05-client-ask-after-message.png
06-admin-dashboard.png
07-admin-files-content.png
08-admin-settings-providers.png
```

## Confirmed behavior

Client Workspace:

- Shows Client Workspace identity clearly.
- Exposes Home, Sources & Files, Knowledge Base, and Ask AI.
- Does not expose AI Provider Configuration.
- Does not expose Agent Connectors.

Sources & Files vs Knowledge Base:

- Sources & Files is presented as raw indexed files and extracted file text.
- Knowledge Base is presented as saved/generated knowledge database content.
- The distinction was validated by automated smoke test and manual UX observation.

Ask AI:

- Chat input accepts a question.
- Submitted user message remains visible.
- Auto-scroll behavior was validated.

Admin Dashboard:

- Shows Admin Dashboard identity clearly.
- Shows operator/admin context.
- Exposes Admin Settings.
- Exposes AI Provider Configuration.
- Confirms provider/API configuration remains Admin-only.

Backend reachability:

- Backend status endpoint responded with HTTP status below 500.
- Token/auth behavior was treated as expected local security behavior.

## Safety invariants preserved

- Normal users use Client Workspace.
- Admin/operators use Admin Dashboard.
- Provider/API-key configuration remains Admin-only.
- Agent Connectors remain Admin-only.
- Client Workspace does not expose provider selection or Agent Connector configuration.
- Client chat uses backend/admin-selected provider behavior.
- Browser clients cannot submit arbitrary shell commands.
- Agent bridge execution remains disabled by default unless explicitly enabled through backend environment flags.
- No trust-score logic was changed.
- No quality-score logic was changed.
- No human-validation governance behavior was changed.

## Known notes from historical report

The historical report recorded npm audit warnings:

```text
Backend dependencies: 2 moderate vulnerabilities
Frontend dependencies: 1 moderate, 1 high vulnerability
```

These warnings did not block the smoke-test validation but remain follow-up hardening items.

The historical report also recorded Playwright installation and local test screenshot generation.

## Final result

```text
Overall: passed
Backend tests: 106/106 passed
Frontend typecheck: passed
Frontend build: passed
Playwright smoke test: 4/4 passed
```

EverythingAI local MVP was validated as product-reviewable in the local Windows environment, with Client/Admin separation, Sources & Files vs Knowledge Base distinction, Ask AI auto-scroll, and Admin-only provider configuration confirmed.

## Current documentation relationship

This restored file exists to satisfy references from:

```text
docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json
docs/ROADMAP.md
docs/IMPLEMENTATION_ROADMAP.md
docs/DOCUMENTATION_AUDIT_2026-06-07.md
```

For the latest consolidated source of truth, use:

```text
docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json
```
