# ROADMAP

## Current roadmap position

EverythingAI is currently in the **local MVP hardening phase**.

The project has moved beyond concept/prototype planning. The current implementation now contains a local backend engine, an Organizor-style React UI, backend-persisted source paths, automatic knowledge consumption, safe organization previews/execution, AI provider settings, live provider model discovery, and initial configured-provider execution for chat and insights.

This roadmap reflects the known work completed in the repository and in the current implementation session up to this update.

The project is **not production ready yet**. The next milestone is to complete local MVP hardening, verify builds/tests, and then move toward production-platform architecture.

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
- [x] Select Organizor-style UI as the main product experience.
- [x] Keep product name as EverythingAI.
- [x] Downgrade old static UI to technical/debug role.
- [x] Define Source Paths as the central scope model.
- [x] Define automatic knowledge consumption from scoped folders.
- [x] Define safe execution principle: AI suggests, user approves.
- [x] Define local MVP before central production platform.

### Product principle

```text
User manages scope.
EverythingAI consumes knowledge.
User approves actions.
```

---

## Phase 2 — Backend core engine

### Goal

Build a working local backend that indexes folders, stores file intelligence, extracts content, searches knowledge, watches folders, and safely organizes files.

### Status

```text
Mostly implemented — needs local verification and hardening
```

### Finished

- [x] SQLite local database.
- [x] File metadata indexing.
- [x] SHA-256 content hashing.
- [x] Document text extraction.
- [x] SQLite FTS keyword search.
- [x] Deterministic vector-style semantic search foundation.
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
- [x] Folder watcher foundation.
- [x] Safe action preview flow.
- [x] Approved rename/move execution.
- [x] Undo foundation.
- [x] AnythingLLM sync backend endpoint.

### Still to finalize

- [ ] Run backend tests locally.
- [ ] Verify source path add/pause/resume/remove after backend restart.
- [ ] Verify watcher behavior for backend-persisted source paths.
- [ ] Add cleanup behavior when removing source paths from scope.
- [ ] Improve failed file and failed extraction reporting.
- [ ] Add regression tests for failed execution and nested undo.
- [ ] Add real background job queue later for production.

---

## Phase 3 — EverythingAI React UI

### Goal

Use the Organizor-style UI as the main user-facing app while keeping the EverythingAI name and backend.

### Status

```text
Implemented as active enhanced UI — needs build verification and cleanup
```

### Finished

- [x] Create `apps/everything-ai-ui` React/Vite app.
- [x] Keep product name as EverythingAI.
- [x] Add Organizor-style Dashboard.
- [x] Add Explorer.
- [x] Add Planning.
- [x] Add Analytics.
- [x] Add Settings.
- [x] Add Source Paths section.
- [x] Load backend-persisted source paths.
- [x] Add source path add/re-scan/pause/resume/remove controls.
- [x] Add AI provider settings UI.
- [x] Add provider cards.
- [x] Add model selector.
- [x] Add model refresh.
- [x] Add provider test connection.
- [x] Add planning rules UI.
- [x] Add real Explorer filters.
- [x] Replace static tags with dynamic file tags.
- [x] Wire content preview to `GET /api/files/:fileId/preview`.
- [x] Replace static AI Confidence with calculated average suggestion confidence.
- [x] Replace static destination folder with editable planning label.
- [x] Add dry-run preview queue.
- [x] Wire execute approved previews.
- [x] Activate enhanced UI through `AppEnhanced.tsx`.
- [x] Add styling for real filter panel, visible/total file count, and scrollable preview text.

### Still to finalize

- [ ] Run `npm install` and `npm run build` in `apps/everything-ai-ui`.
- [ ] Fix TypeScript/build errors if any.
- [ ] Rename `AppEnhanced.tsx` to `App.tsx` after build is stable.
- [ ] Remove or archive old/deprecated `App.tsx`.
- [ ] Improve UI layout after real local testing.
- [ ] Add clearer loading/progress indicators for long scans.

---

## Phase 4 — AI provider system

### Goal

Allow EverythingAI to use configurable local and remote AI providers for chat, insights, planning, and future reasoning.

### Status

```text
Provider settings, live model discovery, and initial execution integration implemented — planning execution still incomplete
```

### Finished

- [x] Backend-persisted provider settings.
- [x] Local Ollama settings.
- [x] OpenRouter settings.
- [x] Cerebras settings.
- [x] Mistral settings.
- [x] Google AI settings.
- [x] Remote provider enable/disable policy.
- [x] API key masking/preservation logic.
- [x] Static fallback model lists.
- [x] Live Ollama model discovery.
- [x] Live OpenRouter model discovery.
- [x] Live Cerebras model discovery.
- [x] Live Mistral model discovery.
- [x] Live Google AI model discovery.
- [x] Provider model refresh endpoint.
- [x] Provider connection test endpoint.
- [x] Server-side configured provider runtime for chat/completions.
- [x] Selected provider can control `/api/chat`.
- [x] Selected provider can control `/api/insights` when provider execution is requested.

### Still to finalize

- [ ] Selected provider must control planning/suggestion generation.
- [ ] Add deeper provider-specific error messages and UI feedback.
- [ ] Improve API key UX: saved / replace / clear.
- [ ] Decide how embeddings provider selection should work.
- [ ] Add tests for Ollama/OpenRouter/Cerebras/Mistral/Google execution fallbacks.

---

## Phase 5 — Planning and organization workflow

### Goal

Let AI generate a safe organization plan, allow the user to review it, dry-run it, and approve execution.

### Status

```text
Functional MVP foundation — backend rules need enforcement
```

### Finished

- [x] Organization suggestions.
- [x] Confidence scoring.
- [x] Selectable suggestions.
- [x] Dry-run action previews.
- [x] Preview ready/blocked states.
- [x] Individual action preview execution.
- [x] Execute Plan button wired to executable previews.
- [x] Confirmation before execution.
- [x] Audit trail foundation.
- [x] Editable destination/planning label replaces static `/Documents/Organized` placeholder.

### Still to finalize

- [ ] Backend must enforce confidence threshold.
- [ ] Backend must enforce allow/disable rename.
- [ ] Backend must enforce allow/disable move.
- [ ] Backend must enforce allow/disable tag.
- [ ] Backend must enforce allow/disable category.
- [ ] Backend must enforce dry-run-only mode.
- [ ] Backend must enforce require-approval mode.
- [ ] Add better grouped folder-structure planning view.
- [ ] Add better bulk select controls.
- [ ] Add Undo UI.
- [ ] Add clearer blocked-action explanations.

---

## Phase 6 — Knowledge layer

### Goal

Turn indexed files and extracted content into a searchable and explainable knowledge base.

### Status

```text
Backend foundation exists — dedicated UI still missing
```

### Finished

- [x] Extracted text stored.
- [x] File insights stored.
- [x] Summaries generated.
- [x] Classifications generated.
- [x] Basic entity extraction.
- [x] File preview endpoint.
- [x] Explorer content preview wired to backend preview endpoint.
- [x] Dynamic file tags use extension, index status, extraction status, insight classification, and file size.
- [x] Related/searchable file references foundation.
- [x] Selected AI provider can be used for knowledge chat through `/api/chat`.

### Still to finalize

- [ ] Add dedicated Knowledge page in React UI.
- [ ] Show summaries.
- [ ] Show classifications.
- [ ] Show extracted entities.
- [ ] Show duplicate groups.
- [ ] Show source map.
- [ ] Show knowledge build status.
- [ ] Add Ask EverythingAI / knowledge chat page.

---

## Phase 7 — Integrations

### Goal

Connect EverythingAI to external knowledge systems and future enterprise data sources.

### Status

```text
Backend foundation started — UI missing
```

### Finished

- [x] AnythingLLM sync backend endpoint.
- [x] AnythingLLM extracted-document upload bridge.

### Still to finalize

- [ ] Add AnythingLLM sync UI.
- [ ] Show sync status.
- [ ] Configure workspace slug in UI.
- [ ] Show sync errors.
- [ ] Add cloud storage connector strategy.
- [ ] Add future SharePoint / OneDrive / Google Drive connector strategy.

---

## Phase 8 — Production platform readiness

### Goal

Move from local MVP into a real production-ready platform with users, workspaces, devices, central database, and client agents.

### Status

```text
Not started — future production phase
```

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
- [ ] CI/build pipeline.
- [ ] Backup and migration strategy.
- [ ] Deployment strategy.

---

## Current production-readiness assessment

```text
Concept:                 Complete
Architecture:            Complete for local MVP
Backend MVP foundation:  70–80%
React UI MVP foundation: 65–75%
AI provider UI:          75–85%
AI provider execution:   45–55%
Planning workflow:       60–70%
Knowledge UI:            20–30%
Production readiness:    20–30%
```

## Immediate next priorities

1. Run backend tests.
2. Run frontend build.
3. Fix build/runtime errors.
4. Connect selected AI provider to planning/suggestion generation.
5. Enforce planning rules in backend suggestion logic.
6. Add Undo UI.
7. Add Knowledge page.
8. Add AnythingLLM sync UI.

## One-sentence status

EverythingAI is now a serious local MVP foundation with backend-persisted source paths, automatic knowledge consumption, Organizor-style UI, provider settings, live model discovery, configured provider execution for chat/insights, and safe planning workflow — but it still needs backend planning-rule enforcement, provider-driven planning generation, knowledge UI, undo/sync UI, testing, and production hardening before it is fully production ready.
