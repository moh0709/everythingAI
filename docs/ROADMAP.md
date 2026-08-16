# 2026-08-16 Roadmap Reconciliation

> Current roadmap authority: `docs/PHASE0_RECONCILIATION_BASELINE_2026-08-14.md`. This overlay supersedes conflicting “next phase” statements below while preserving historical roadmap detail.

## Current five-track roadmap

| Track | Verified position | Current exit gate |
|---|---|---|
| Product and UX | Local Client Workspace and Admin Dashboard foundations implemented | Define and validate the local MVP release-candidate scope |
| Knowledge and Safe Action | Source-backed knowledge, planning, preview, approval, execution, undo, and audit foundations exist | Validate end-to-end release-candidate workflows and evidence UX |
| Enterprise Platform | Target architecture documented; production platform incomplete | Keep future until CEO selects the production-platform milestone |
| Engineering Operations | Repository reliability foundation exists; Linux systemd work remains explicit infrastructure backlog | Resolve or formally supersede #68/#76 when required by the chosen milestone |
| Governance and Autonomous Delivery | Issue #103 accepted; Forge foundations implemented; #105 soak still blocked | Accept one clean autonomous Forge cycle and maintain exclusive execution ownership |

## Active sequence

1. Reconcile live issue state and preserve corrected queue ownership.
2. Complete #105 with clean unchanged scheduler evidence, result 0, and no duplicate claim.
3. Keep ChatGPT as sole PM/release authority; activate Forge as primary code executor only after #105 acceptance.
4. Keep Hermes isolated to explicitly assigned infrastructure/operational work.
5. Synchronize canonical documents with this five-track model.
6. Establish and validate the local MVP release-candidate baseline.
7. Lift the temporary major-feature freeze only after the Phase 0 exit gate is met.

## Protected and unreleased work

- #69 remains protected and unchanged unless the CEO explicitly changes that rule.
- #3–#13 and #19 remain open and unreleased; implementation evidence does not equal PM acceptance.
- #78 remains future/unreleased Atlas work.
- No bare phase number may be treated as the complete program status.

---

# ROADMAP

## Current roadmap position

EverythingAI is now in the **validated local MVP + Phase 8.2 CI smoke integration complete** phase.

The project has moved beyond concept/prototype planning and beyond an unverified local MVP. The current implementation contains a working local backend engine, separated Client Workspace and Admin Dashboard UIs, backend-persisted source paths, automatic knowledge consumption, durable Knowledge Base/Wiki pages, safe planning previews/execution, undo/recovery, broad AI provider configuration, provider-backed planning, and admin-only Agent Connectors.

Latest consolidated source of truth:

```text
docs/HANDOVER_2026-06-13_PHASE8_2_CI_SMOKE_COMPLETION.json
```

Latest validation artifacts:

```text
docs/VALIDATION_2026-06-13_PHASE8_2_CI_SMOKE_COMPLETION.md
docs/VALIDATION_2026-06-09_AGENT_CONNECTOR_DETECTION.md
docs/VALIDATION_PLAN_2026-06-09_AGENT_VERSION_PROBES.md
docs/VALIDATION_2026-06-07_LOCAL_SMOKE_TEST.md
docs/VALIDATION_2026-06-07_ADMIN_AGENT_CONNECTORS.md
```

Current validated baseline:

```text
Backend npm test:        113/113 passed
Frontend typecheck:      PASS
Frontend build:          PASS
CI smoke pipeline:       implemented
Connector detection:     Codex and Claude Code detected
Version probes:          Codex and Claude Code PASS
```

The project is **not production ready yet**, but the local MVP is now product-reviewable, connector safety/detection/version-probe history is documented, and CI smoke-test integration is complete.

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
- [x] Backend test suite validated at 113/113 passing after connector safety tests.

### Still to finalize

- [ ] Controlled connector-specific testing for real local Codex / Claude Code installs. OpenCode is not installed or not on PATH.
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
AnythingLLM sync UI exists; Admin Agent Connectors validated; connector detection/version probes completed; connector-specific setup still pending
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
- [x] Connector detection completed for configured catalog.
- [x] Controlled version probes completed for detected connectors.
- [x] Disabled-by-default local agent bridge safety model.
- [x] Client Workspace does not expose Agent Connectors.

### Still to finalize

- [ ] Controlled connector-specific setup/testing for real local Codex install.
- [ ] Controlled connector-specific setup/testing for real local Claude Code install.
- [ ] Keep OpenCode documented as not installed / not on PATH until installed.
- [ ] Keep Kilo Code, Aider, Continue, and Cline documented as not installed / not on PATH until installed.
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true` locally.
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_CHAT_ENABLED=true` locally.
- [ ] AnythingLLM remains optional/not configured unless intentionally installed and connected.
- [ ] Add cloud storage connector strategy.
- [ ] Add future SharePoint / OneDrive / Google Drive connector strategy.

---

## Phase 8.1 — Agent Connector Safety, Detection, and Controlled Version Probes

### Goal

Validate local agent connector safety boundaries without exposing connectors to Client Workspace, enabling agent chat by default, or allowing arbitrary shell command execution.

### Status

```text
Complete
```

### Finished

- [x] Phase 8.1A — Connector Safety Tests.
- [x] Phase 8.1B — Connector Detection.
- [x] Phase 8.1C — Controlled Version Probes.
- [x] Phase 8.1C.1 — Windows Connector Compatibility.
- [x] Connector catalog remains Admin-only.
- [x] Client Workspace remains free of Agent Connector settings.
- [x] Agent bridge execution remains disabled by default.
- [x] Agent chat execution remains disabled by default.
- [x] Arbitrary shell command execution remains blocked.
- [x] Codex detected and version-probed as `codex-cli 0.124.0`.
- [x] Claude Code detected and version-probed as `2.1.176`.
- [x] OpenCode, Kilo Code, and Cline documented as not installed or not on PATH.

### Still to finalize

- [ ] Controlled connector-specific setup/testing for installed Codex.
- [ ] Controlled connector-specific setup/testing for installed Claude Code.
- [ ] Revisit OpenCode, Kilo Code, and Cline only after they are installed or explicitly added to PATH.

---

## Phase 8.2 — CI Smoke Test Integration

### Goal

Move the validated local MVP into repeatable CI validation for backend tests, frontend typecheck/build, and Playwright smoke testing.

### Status

```text
Complete
```

### Finished

- [x] CI smoke-test workflow documented at `.github/workflows/ci-smoke.yml`.
- [x] CI triggers documented for `push -> main` and `pull_request -> main`.
- [x] Backend CI job documented for `services/api` using `npm ci` and `npm test`.
- [x] Frontend CI job documented for `apps/everything-ai-ui` using `npm ci`, `npm run typecheck`, and `npm run build`.
- [x] Playwright CI smoke job documented for `smoke/client-admin-smoke.spec.ts`.
- [x] Playwright Chromium dependency install documented for CI.
- [x] CI artifacts documented for `playwright-report` and `test-results`.
- [x] Backend baseline documented at 113/113 passing.
- [x] Frontend typecheck and build documented as PASS.
- [x] Phase 8.2 handover and validation artifacts created.

### Still to finalize

- [ ] Continue release hardening under Phase 8.3.
- [ ] Keep CI smoke coverage aligned with UI changes.
- [ ] Add deeper enterprise release gates later when auth, tenant isolation, and production infrastructure are implemented.

---

## Phase 8.3 — Connector-Specific Setup, Release Hardening, and Production-Readiness Cleanup

### Goal

Use the completed Phase 8.2 baseline to harden installed connector workflows, continue release cleanup, and prepare the local MVP for broader product review without weakening security boundaries.

### Status

```text
Next recommended phase
```

### Required next

- [ ] Controlled connector-specific setup/testing for Codex.
- [ ] Controlled connector-specific setup/testing for Claude Code.
- [ ] Keep OpenCode, Kilo Code, and Cline documented as not installed / not on PATH until installed.
- [ ] Continue frontend modularization and cleanup of legacy admin paths.
- [ ] Improve API key lifecycle UX: saved / replace / clear.
- [ ] Improve rich citation/source highlighting and extracted document formatting.
- [ ] Update release checklist after Phase 8.3 work.

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
Admin Agent Connectors:     75–85% implemented, connector-specific setup pending
CI smoke integration:       complete
Production readiness:       30–40%
```

## Immediate next priorities

1. Phase 8.3 connector-specific setup/testing for installed Codex and Claude Code.
2. Continue release hardening and frontend modularization.
3. Improve API key lifecycle UX.
4. Improve rich citation/source highlighting and extracted document formatting.
5. Keep AnythingLLM and OpenDataLoader PDF as optional future connectors only when they add clear new value.

## One-sentence status

EverythingAI is now a validated local-first, source-backed AI knowledge workspace with a safe Client Workspace, Admin Dashboard, durable Knowledge Base, governed planning/execution/undo, admin-selected AI providers, admin-only Agent Connectors, completed connector safety/detection/version-probe history, and completed CI smoke-test integration — ready for Phase 8.3 connector-specific setup and release hardening, but not yet production platform ready.
