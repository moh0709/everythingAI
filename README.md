# EverythingAI / EverythingApp

EverythingAI is the project foundation for **EverythingApp**: a local-first, source-backed AI knowledge workspace for indexing local files, extracting document text, searching, chatting, generating controlled Knowledge Base / Wiki pages, and safely preparing governed file-organization workflows.

## Current baseline

```text
Local MVP baseline date: 2026-06-07
Backend tests: 106 passed / 0 failed
Frontend typecheck: PASS
Frontend build: PASS
Playwright smoke test: 4 passed / 0 failed
Windows local running-app smoke: PASS
```

Latest source-of-truth documents:

```text
docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json
docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md
docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md
```

## One-sentence definition

**EverythingApp is a local AI-powered file brain that indexes local folders, understands file and document contents, remembers filenames and paths, answers questions with source references through the AI provider selected by Admin, generates controlled source-backed Knowledge Base pages, and safely suggests or performs approved file organization such as tagging, renaming, and moving files.**

## Current focus

The current objective is to preserve the validated **local MVP** baseline while moving into controlled connector-specific testing and CI smoke automation.

EverythingAI should remain stable, safe, boring, and reliable before broader production-platform features are added.

## Current local MVP status

```text
Backend local MVP: runnable through API
Client Workspace:  http://localhost:5151
Admin Dashboard:   http://localhost:5151/admin.html
Backend API:       http://127.0.0.1:4100
Automated backend tests: 106 passed / 0 failed
Frontend typecheck/build: passed
Playwright smoke test: 4 passed / 0 failed
```

Validated MVP capabilities:

```text
Phase 1: Product direction and local-first architecture — complete / validated
Phase 2: Backend core engine — complete for local MVP / validated
Phase 3: Client Workspace and Admin Dashboard — complete for local MVP / validated
Phase 4: AI provider system — admin-selected provider runtime validated
Phase 5: Governed planning/execution/undo — complete for local MVP / validated
Phase 6: Knowledge Base / Wiki layer — complete for local MVP / validated
Phase 7: Integrations and Admin Agent Connectors — implemented / connector-specific setup pending
Phase 8: CI and production hardening — next phase
```

The local MVP currently supports:

- Local folder indexing
- Backend-persisted source paths
- Source path add / pause / resume / remove
- Watcher resume on backend startup
- Document extraction
- Keyword search and source references
- Semantic-style local search
- Document context
- Source-backed controlled Knowledge Base / Wiki pages
- Knowledge map and detail view
- Wiki citations and source chunks
- PDF/page metadata in Wiki source chunks when extractor metadata is available
- Knowledge Quality scoring
- Human Validation layer
- Governance conflict and review candidate visibility
- Scanner skip reporting
- Watcher debounce, queued rerun handling, and runtime status
- Deterministic and provider-backed planning suggestions
- Planning-rule enforcement
- Suggestions and action previews
- Approval-gated action execution
- Recovery snapshots for filesystem mutation
- Approval-gated undo for supported filesystem actions
- Local trash/restore behavior
- Permanent purge blocking
- Execution batches with approval and audit
- Client Workspace Ask AI with auto-scroll
- Admin-only AI Provider Configuration
- Admin-only Agent Connectors panel
- Playwright smoke-test agent

## Client Workspace vs Admin Dashboard

EverythingAI has a strict product split:

```text
Client Workspace
  -> safe user experience
  -> Home
  -> Sources & Files
  -> Knowledge Base
  -> Ask AI
  -> no provider/API-key configuration
  -> no Agent Connectors
```

```text
Admin Dashboard
  -> operator control center
  -> source paths
  -> indexing/extraction operations
  -> AI Provider Configuration
  -> remote-provider policy
  -> planning rules
  -> Admin Agent Connectors
  -> analytics and diagnostics
```

Client users can chat with AI, but only through the AI provider selected in Admin/backend settings. The public `/api/chat` route does not accept request-body provider override.

## Admin AI providers and Agent Connectors

Admin Settings support a broad AI provider catalog, including:

```text
Ollama
OpenAI
Anthropic / Claude
OpenRouter
Cerebras
Mistral
Google AI
DeepSeek
Groq
xAI / Grok
Moonshot / Kimi
Together AI
Fireworks AI
Perplexity
Azure OpenAI
LM Studio
Custom OpenAI-compatible
```

Admin Agent Connectors currently include catalog entries for:

```text
Codex
Claude Code
OpenCode
Kilo Code
Aider
Continue
Cline
```

Agent connector execution is disabled by default. Local agent bridge execution requires explicit backend environment flags:

```text
EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true
EVERYTHINGAI_AGENT_CHAT_ENABLED=true
```

The browser cannot submit arbitrary shell commands. Only saved connector commands can be detected/probed/chat-enabled through backend bridge rules.

## Content-controlled Knowledge Base rule

The Knowledge Base / Wiki layer is intentionally strict:

```text
Document body content must come from extracted source text.
AI summaries must not be used as fake source-backed document body content.
```

If extracted source text is missing, the page must clearly show:

```text
No source-backed extracted document content is available yet.
```

Validated by:

```text
services/api/test/wikiContentControl.test.js
```

## Local development entry points

Start backend:

```powershell
cd C:\temp\EverythingAI\services\api
npm run dev
```

Start frontend:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run dev
```

Open:

```text
Client Workspace: http://localhost:5151
Admin Dashboard:  http://localhost:5151/admin.html
Backend API:      http://127.0.0.1:4100
```

Run backend tests:

```powershell
cd C:\temp\EverythingAI\services\api
npm test
```

Run frontend validation:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Run Playwright smoke test:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
```

Manual Wiki schema repair, if needed for older local SQLite databases:

```powershell
cd C:\temp\EverythingAI\services\api
npm run repair:wiki-schema
```

The backend startup scripts also run Wiki schema repair before API startup.

## Local MVP optimization environment variables

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT=50000
EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT=4000
EVERYTHINGAI_WIKI_CHUNK_CHAR_LIMIT=900
```

Recommended for first local tests:

```powershell
$env:EVERYTHINGAI_MAX_FILE_SIZE_BYTES="262144000"
$env:EVERYTHINGAI_EXCLUDE_NAMES="node_modules,.git,dist,build"
$env:EVERYTHINGAI_EXCLUDE_EXTENSIONS=".exe,.dll,.iso,.zip"
$env:EVERYTHINGAI_WATCH_DEBOUNCE_MS="1000"
```

## Important local MVP safety rules

```text
Delete actions are disabled.
Permanent purge is blocked in the local MVP.
Move/rename requires preview and explicit approval.
Failed execution attempts are audited.
Undo requires explicit approval.
Active trashed files are hidden from normal file list and keyword/unified search.
includeTrashed=true is only for recovery/admin views.
AI summaries must not populate source-backed document body content.
Provider/API-key configuration is Admin-only.
Agent Connectors are Admin-only.
Agent bridge execution is disabled by default.
Client Workspace users chat only through the backend/admin-selected provider.
```

## Current architecture split

```text
services/api                    Backend API, SQLite persistence, indexing, extraction, search, AI/knowledge services, safe actions, recovery, audit, provider runtime, agent bridge
apps/everything-ai-ui            React Client Workspace and Admin Dashboard frontend
http://localhost:5151            Official Client Workspace
http://localhost:5151/admin.html Admin Dashboard during local development
```

## Documentation

See the `/docs` folder.

### Current source-of-truth documentation

- [`HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json`](docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json)
- [`VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md`](docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md)
- [`VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md`](docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md)
- [`ROADMAP.md`](docs/ROADMAP.md)
- [`IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md)

### Current local MVP documentation

- [`MVP_FINALIZATION_PLAN.md`](docs/MVP_FINALIZATION_PLAN.md)
- [`KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)
- [`WINDOWS_LOCAL_SMOKE_TEST.md`](docs/WINDOWS_LOCAL_SMOKE_TEST.md)
- [`MVP_SMOKE_TEST_RUNBOOK.md`](docs/MVP_SMOKE_TEST_RUNBOOK.md)
- [`MVP_API_ROUTES.md`](docs/MVP_API_ROUTES.md)
- [`LOCAL_MVP_VS_CENTRAL_PLATFORM.md`](docs/LOCAL_MVP_VS_CENTRAL_PLATFORM.md)
- [`WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md`](docs/WIKI_KNOWLEDGE_BASE_TECHNICAL_DESIGN.md)
- [`PLAYWRIGHT_SMOKE_TEST_AGENT.md`](docs/PLAYWRIGHT_SMOKE_TEST_AGENT.md)

### Future product track

The future archive/organization product track is captured separately:

- [`AI_ORGANIZATION_WORKSPACE_DESIGN.md`](docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md)
- GitHub issue `#21`: Future Track: AI Organization Workspace / Managed Knowledge Archive

This future track should remain separate from the current local MVP unless explicitly selected as the next priority.

### Product and architecture references

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
- [`DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`SECURITY_AND_FILE_SAFETY.md`](docs/SECURITY_AND_FILE_SAFETY.md)
- [`ROADMAP.md`](docs/ROADMAP.md)

### Enterprise workspace documentation

The production target remains a governed enterprise cognitive workspace, but it is not part of the current local MVP baseline.

- [`ENTERPRISE_WORKSPACE_PRD.md`](docs/ENTERPRISE_WORKSPACE_PRD.md)
- [`ENTERPRISE_TECHNICAL_ARCHITECTURE.md`](docs/ENTERPRISE_TECHNICAL_ARCHITECTURE.md)
- [`ENTERPRISE_DEPLOYMENT_INFRASTRUCTURE.md`](docs/ENTERPRISE_DEPLOYMENT_INFRASTRUCTURE.md)
- [`ENTERPRISE_SECURITY_GOVERNANCE_HARDENING.md`](docs/ENTERPRISE_SECURITY_GOVERNANCE_HARDENING.md)
- [`ENTERPRISE_SCHEMA_CONTRACTS.md`](docs/ENTERPRISE_SCHEMA_CONTRACTS.md)
- [`ENTERPRISE_API_CONTRACTS.md`](docs/ENTERPRISE_API_CONTRACTS.md)
- [`ENTERPRISE_TESTING_VALIDATION.md`](docs/ENTERPRISE_TESTING_VALIDATION.md)
- [`ENTERPRISE_UX_SPEC.md`](docs/ENTERPRISE_UX_SPEC.md)
- [`ENTERPRISE_ACCESS_CONTROL.md`](docs/ENTERPRISE_ACCESS_CONTROL.md)
- [`INTERNAL_FILE_ECOSYSTEM.md`](docs/INTERNAL_FILE_ECOSYSTEM.md)
- [`SEARCH_EXPLORE_WIKI.md`](docs/SEARCH_EXPLORE_WIKI.md)
- [`PLANNING_EXECUTION_RECOVERY.md`](docs/PLANNING_EXECUTION_RECOVERY.md)
- [`OPERATIONS_INSIGHTS_TICKETS.md`](docs/OPERATIONS_INSIGHTS_TICKETS.md)
- [`MVP_LAUNCH_GATE.md`](docs/MVP_LAUNCH_GATE.md)
- [`IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md)
- [`AI_CODING_AGENT_IMPLEMENTATION_PROMPT.md`](docs/AI_CODING_AGENT_IMPLEMENTATION_PROMPT.md)

## Local file brain MVP details

The runnable MVP lives in `services/api` and `apps/everything-ai-ui`. It scans local folders, reads file metadata, computes SHA-256 content hashes, extracts document text, searches metadata/content with SQLite FTS and semantic-style retrieval, answers through the backend/admin-selected AI provider, generates insights, builds a durable Knowledge Base, finds duplicates, watches folders, and safely organizes files after preview and approval.
