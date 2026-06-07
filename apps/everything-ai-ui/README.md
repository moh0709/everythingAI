# EverythingAI UI

This React/Vite app has separate Client Workspace and Admin Dashboard entry points.

Current validated state:

```text
Date: 2026-06-07
Frontend typecheck: PASS
Frontend build: PASS
Playwright smoke test: 4/4 PASS
```

Latest validation references:

```text
../../docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json
../../docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md
../../docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md
```

## Client Workspace

The official user-facing MVP UI is safe and non-destructive.

```bash
cd apps/everything-ai-ui
npm run dev
```

URL:

```txt
http://localhost:5151
```

Entry flow:

```txt
index.html
  -> src/main.tsx
  -> src/UserApp.tsx
```

Client Workspace navigation:

```txt
Home
Sources & Files
Knowledge Base
Ask AI
```

Client Workspace must not expose:

- provider/API-key configuration
- remote-provider policy
- Agent Connectors
- planning policy controls
- file move execution controls
- rename execution controls
- batch execution controls
- recovery purge controls
- source-path administration beyond the approved client workflow
- audit administration
- admin/operator controls

Client Workspace users can chat with AI, but only through the backend/admin-selected active provider. The public `/api/chat` route does not accept request-body provider override.

## Admin Dashboard

The admin/operator UI is separated for source-path management, planning, execution governance, audit, provider settings, Agent Connectors, and system configuration.

Default same-port local development URL when running `npm run dev`:

```txt
http://localhost:5151/admin.html
```

Dedicated admin dev server, if desired:

```bash
cd apps/everything-ai-ui
npm run dev:admin
```

Dedicated admin URL:

```txt
http://localhost:5152/admin.html
```

Entry flow:

```txt
admin.html
  -> src/admin-main.tsx
  -> src/admin/AdminApp.tsx
```

Admin Dashboard includes:

- Dashboard
- Files & Content
- Planning
- Ask AI
- Analytics
- Settings
- AI Provider Configuration
- Remote-provider policy
- Admin Agent Connectors

Admin Agent Connectors currently include catalog entries for:

```txt
Codex
Claude Code
OpenCode
Kilo Code
Aider
Continue
Cline
```

Agent bridge execution remains disabled by default unless backend environment flags explicitly enable it:

```txt
EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true
EVERYTHINGAI_AGENT_CHAT_ENABLED=true
```

The browser cannot submit arbitrary shell commands. Only saved connector commands can be detected/probed/chat-enabled through backend bridge rules.

## Verification

Before switching runtime behavior or after frontend changes, validate the UI app locally:

```bash
cd apps/everything-ai-ui
npm install
npm run typecheck
npm run build
```

Run the Playwright smoke test:

```bash
cd apps/everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

Expected current baseline:

```txt
Frontend typecheck: PASS
Frontend build: PASS
Playwright smoke test: 4/4 PASS
```

Manual smoke URLs:

```txt
Client Workspace:
http://localhost:5151

Admin Dashboard on same dev server:
http://localhost:5151/admin.html

Admin Dashboard on dedicated admin dev server:
http://localhost:5152/admin.html
```

## Safety Rule

Do not import admin/operator configuration surfaces into `UserApp.tsx`.

The Client Workspace and Admin Dashboard must remain separate.

Provider/API-key configuration and Agent Connectors are Admin-only.
