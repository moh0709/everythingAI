# ROADMAP

## Current roadmap position

EverythingAI is now in the **validated local MVP + admin connector hardening phase**.

The project has moved beyond concept/prototype planning and beyond an unverified local MVP. The current implementation contains a working local backend engine, separated Client Workspace and Admin Dashboard UIs, backend-persisted source paths, automatic knowledge consumption, durable Knowledge Base/Wiki pages, safe planning previews/execution, undo/recovery, broad AI provider configuration, provider-backed planning, and admin-only Agent Connectors.

Latest consolidated source of truth:

```text
docs/HANDOVER_2026-06-07_LOCAL_MVP_AND_AGENT_CONNECTORS_VALIDATED.json
```

Latest validation artifacts:

```text
docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md
docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md
```

Current validated baseline:

```text
Backend npm test:        106/106 passed
Frontend typecheck:      passed
Frontend build:          passed
Playwright smoke test:   4/4 passed
```

The project is **not production ready yet**, but the local MVP is now product-reviewable and smoke-tested in the running Windows environment.

---

## Phase 1 — Product direction and architecture

### Goal

Define what EverythingAI is, what it should do, and how the system should be structured.

### Status

```text
Complete
```

### Finished

- [x] Define EverythingAI / EverythingApp product vision.
- [x] Define EverythingAI as a local-first AI file brain.
- [x] Define EverythingAI as a source-backed AI knowledge workspace, not only file search/chat.
- [x] Select separated Client Workspace and Admin Dashboard as the main product experience.
- [x] Keep product name as EverythingAI.
- [x] Define Source Paths as the central local scope model.
- [x] Define automatic knowledge consumption from scoped folders.
- [x] Define safe execution principle: AI suggests, user/admin approves.
- [x] Define local MVP before central production platform.

### Product principle

```text
Admin controls scope and engines.
EverythingAI consumes knowledge.
Client users ask and explore safely.
Admin approves high-risk actions.
```

---

## Phase 2 — Backend core engine

### Goal

Build a working local backend that indexes folders, stores file intelligence, extracts content, searches knowledge, watches folders, and safely organizes files.

### Status

```text
Validated local MVP backend
```

### Finished

- [x] SQLite local database.
- [x] File metadata indexing.
- [x] SHA-256 content hashing.
- [x] Document text extraction.
- [x] SQLite FTS keyword search.
- [x] Deterministic semantic-style search foundation.
- [x] File embeddings table.
- [x] File insights table.
- [x] Organization suggestions table.
- [x] Action previews table.
- [x] Action executions table.
- [x] Audit log table.
- [x] Watch roots / source paths table.
- [x] App settings table.
- [x] Source Paths API.
- [x] Provider settings API.
- [x] Agent bridge API foundation.
- [x] Folder watcher foundation.
- [x] Persisted watcher resume on backend startup.
- [x] Safe action preview flow.
- [x] Approved rename/move execution.
- [x] Execution batches.
- [x] Undo/recovery snapshots.
- [x] Trash/restore and permanent purge blocking.
- [x] AnythingLLM sync backend endpoint.
- [x] Backend test suite validated at 106/106 passing.

### Still to finalize

- [ ] Controlled connector-specific testing for real local Codex / Claude Code / OpenCode installs.
- [ ] Add CI job to run backend tests automatically.
- [ ] Add real background job queue later for production.
- [ ] Add production-grade secure credential storage later.

---

## Phase 3 — EverythingAI React UI

### Goal

Provide a clear, safe user-facing Client Workspace and a separate Admin Dashboard for operator configuration and control.

### Status

```text
Validated local MVP UI
```

### Finished

- [x] Create `apps/everything-ai-ui` React/Vite app.
- [x] Keep product name as EverythingAI.
- [x] Add Client Workspace.
- [x] Add Admin Dashboard.
- [x] Add clear `CLIENT WORKSPACE` and `ADMIN DASHBOARD` labels.
- [x] Separate client navigation into Home, Sources & Files, Knowledge Base, and Ask AI.
- [x] Add admin navigation for Dashboard, Files & Content, Planning, Ask AI, Analytics, and Settings.
- [x] Clearly separate raw file/source exploration from the generated Knowledge Base.
- [x] Add Source Paths section.
- [x] Load backend-persisted source paths.
- [x] Add source path add/re-scan/pause/resume/remove controls.
- [x] Add AI provider settings UI in Admin Settings only.
- [x] Add provider cards and model selector.
- [x] Add model refresh and provider connection test.
- [x] Add planning rules UI.
- [x] Add real Explorer filters.
- [x] Wire content preview to `GET /api/files/:fileId/preview`.
- [x] Add dry-run preview queue.
- [x] Wire execute approved previews.
- [x] Add Undo UI.
- [x] Add Ask AI auto-scroll.
- [x] Add Playwright smoke test for client/admin separation and key flows.
- [x] Frontend typecheck/build validated.
- [x] Playwright smoke test validated at 4/4 passing.

### Still to finalize

- [ ] Add CI job for frontend typecheck/build and Playwright smoke test.
- [ ] Continue controlled frontend modularization and cleanup of legacy admin paths.
- [ ] Improve UI layout after broader product review.
- [ ] Add clearer progress indicators for long scans/builds where still needed.

---

## Phase 4 — AI provider system

### Goal

Allow EverythingAI to use configurable local and remote AI providers for chat, insights, planning, and future reasoning while keeping provider control Admin-only.

### Status

```text
Validated provider runtime and admin-only configuration
```

### Finished

- [x] Backend-persisted provider settings.
- [x] Local Ollama settings.
- [x] OpenAI settings.
- [x] Anthropic / Claude settings.
- [x] OpenRouter settings.
- [x] Cerebras settings.
- [x] Mistral settings.
- [x] Google AI settings.
- [x] DeepSeek settings.
- [x] Groq settings.
- [x] xAI / Grok settings.
- [x] Moonshot / Kimi settings.
- [x] Together AI settings.
- [x] Fireworks AI settings.
- [x] Perplexity settings.
- [x] Azure OpenAI settings.
- [x] LM Studio settings.
- [x] Custom OpenAI-compatible settings.
- [x] Remote provider enable/disable policy.
- [x] API key masking/preservation logic.
- [x] Static fallback model lists.
- [x] Live model discovery where implemented.
- [x] Provider model refresh endpoint.
- [x] Provider connection test endpoint.
- [x] Server-side configured provider runtime for chat/completions.
- [x] Selected provider can control `/api/chat`.
- [x] Public `/api/chat` route no longer accepts request-body provider override.
- [x] Selected provider can control `/api/insights` when provider execution is requested.
- [x] Selected provider can control planning/suggestion generation.
- [x] Provider-specific error codes and hints.
- [x] Provider/API-key configuration remains Admin-only.

### Still to finalize

- [ ] Controlled real-provider testing with actual API credentials where desired.
- [ ] Improve API key UX: saved / replace / clear.
- [ ] Decide how embeddings provider selection should work.
- [ ] Add CI-safe mocked provider route tests where gaps remain.

---

## Phase 5 — Planning and organization workflow

### Goal

Let AI generate a safe organization plan, allow the user/admin to review it, dry-run it, approve execution, and undo where supported.

### Status

```text
Validated governed local MVP workflow
```

### Finished

- [x] Organization suggestions.
- [x] Provider-backed organization suggestions.
- [x] Deterministic/provider/hybrid planning modes.
- [x] Confidence scoring.
- [x] Backend confidence threshold enforcement.
- [x] Backend allow/disable enforcement for rename/move/tag/category.
- [x] Backend dry-run-only enforcement.
- [x] Backend require-approval enforcement.
- [x] Selectable suggestions.
- [x] Dry-run action previews.
- [x] Preview ready/blocked states.
- [x] Individual action preview execution.
- [x] Execute Plan button wired to executable previews.
- [x] Confirmation before execution.
- [x] Audit trail.
- [x] Execution batches.
- [x] Undo UI.
- [x] Recovery snapshots.
- [x] Clearer blocked-action explanations.

### Still to finalize

- [ ] Add better grouped folder-structure planning view.
- [ ] Add better bulk select controls.
- [ ] Add richer manual product QA around move/rename on disposable test folders.

---

## Phase 6 — Knowledge layer

### Goal

Turn indexed files and extracted content into a searchable, explainable, source-backed Knowledge Base.

### Status

```text
Validated local MVP knowledge layer
```

### Finished

- [x] Extracted text stored.
- [x] File insights stored.
- [x] Summaries generated.
- [x] Classifications generated.
- [x] Basic entity extraction.
- [x] File preview endpoint.
- [x] Explorer content preview wired to backend preview endpoint.
- [x] Dynamic file/source labels.
- [x] Related/searchable file references foundation.
- [x] Selected AI provider can be used for knowledge chat through `/api/chat`.
- [x] Durable Wiki / Knowledge Base storage.
- [x] Knowledge page in Client Workspace.
- [x] Knowledge Base detail view.
- [x] Knowledge map/navigation.
- [x] Source-backed reading mode foundation.
- [x] File Sources rail.
- [x] Evidence/citation diagnostics.
- [x] Knowledge Quality scoring.
- [x] Human Validation layer.
- [x] Governance Conflict Dashboard.
- [x] Review Candidate Dashboard.

### Still to finalize

- [ ] Improve rich citation rendering and source highlighting where needed.
- [ ] Improve extracted document formatting for books/blogs/tables/media.
- [ ] Evaluate optional OpenDataLoader PDF connector only if it clearly adds new extraction capabilities.

---

## Phase 7 — Integrations and Admin Agent Connectors

### Goal

Connect EverythingAI to optional external knowledge systems and admin-only local agent tools without replacing EverythingAI as the main product interface.

### Status

```text
AnythingLLM sync UI exists; Admin Agent Connectors validated; connector-specific setup still pending
```

### Finished

- [x] AnythingLLM sync backend endpoint.
- [x] AnythingLLM extracted-document upload bridge.
- [x] AnythingLLM sync UI in Knowledge page.
- [x] Admin Agent Connectors panel.
- [x] Codex connector catalog entry.
- [x] Claude Code connector catalog entry.
- [x] OpenCode connector catalog entry.
- [x] Kilo Code, Aider, Continue, and Cline catalog entries.
- [x] Agent bridge status refresh.
- [x] Agent detect and detect-all actions.
- [x] Agent version probe action.
- [x] Disabled-by-default local agent bridge safety model.
- [x] Client Workspace does not expose Agent Connectors.

### Still to finalize

- [ ] Controlled connector-specific setup/testing for real local Codex install.
- [ ] Controlled connector-specific setup/testing for real local Claude Code install.
- [ ] Controlled connector-specific setup/testing for real local OpenCode install.
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true` locally.
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_CHAT_ENABLED=true` locally.
- [ ] AnythingLLM remains optional/not configured unless intentionally installed and connected.
- [ ] Add cloud storage connector strategy.
- [ ] Add future SharePoint / OneDrive / Google Drive connector strategy.

---

## Phase 8 — CI, launch hardening, and production platform readiness

### Goal

Move from validated local MVP into repeatable CI validation, release hardening, and later production-ready platform architecture.

### Status

```text
Next recommended phase
```

### Required next

- [ ] Add GitHub Actions / CI workflow for backend `npm test`.
- [ ] Add CI workflow for frontend `npm run typecheck` and `npm run build`.
- [ ] Add CI workflow for Playwright smoke test.
- [ ] Archive Playwright screenshots/reports as CI artifacts.
- [ ] Update release checklist.
- [ ] Continue frontend modularization.

### Required later

- [ ] Authentication.
- [ ] Users.
- [ ] Workspace / tenant model.
- [ ] Device/client identity.
- [ ] Installed client agent architecture.
- [ ] Central server architecture.
- [ ] PostgreSQL migration.
- [ ] pgvector or dedicated vector database.
- [ ] Background job queue.
- [ ] Secure credential storage.
- [ ] Enterprise permission model.
- [ ] File access control model.
- [ ] Production logging and monitoring.
- [ ] Backup and migration strategy.
- [ ] Deployment strategy.

---

## Current production-readiness assessment

```text
Concept:                    Complete
Architecture:               Complete for validated local MVP
Backend local MVP:          90–95%
Client Workspace MVP:       85–90%
Admin Dashboard MVP:        85–90%
AI provider system:         85–90%
Planning workflow:          85–90%
Knowledge Base UI:          80–85%
Admin Agent Connectors:     70–80% implemented, connector-specific setup pending
Production readiness:       30–40%
```

## Immediate next priorities

1. Controlled connector-specific setup/testing for Codex, Claude Code, and OpenCode.
2. Add CI smoke-test integration for backend, frontend, and Playwright.
3. Continue controlled frontend modularization and cleanup of legacy admin paths.
4. Improve API key lifecycle UX.
5. Improve rich citation/source highlighting and extracted document formatting.
6. Keep AnythingLLM and OpenDataLoader PDF as optional future connectors only when they add clear new value.

## One-sentence status

EverythingAI is now a validated local-first, source-backed AI knowledge workspace with a safe Client Workspace, Admin Dashboard, durable Knowledge Base, governed planning/execution/undo, admin-selected AI providers, and admin-only Agent Connectors — ready for connector-specific testing and CI hardening, but not yet production platform ready.
