# MVP FINALIZATION PLAN

## Objective

Finalize and preserve the current EverythingAI local MVP so it remains stable, optimized, safe, smoke-tested, and ready for serious product review before moving to full central platform architecture.

## Current source of truth

Latest consolidated handover:

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
Date: 2026-06-13
Backend npm test:        113/113 passed
Frontend typecheck:      PASS
Frontend build:          PASS
CI smoke pipeline:       implemented
```

## Current MVP scope

The current MVP is split into:

```text
services/api                    Backend API, SQLite persistence, indexing, extraction, search, AI/knowledge services, safe actions, recovery, audit, provider runtime, agent bridge
apps/everything-ai-ui            React Client Workspace and Admin Dashboard frontend
http://localhost:5151            Official Client Workspace
http://localhost:5151/admin.html Admin Dashboard on the same dev server
http://localhost:5152/admin.html Optional dedicated Admin Dashboard dev server via npm run dev:admin
```

The local MVP is focused on:

- local folder indexing
- backend-persisted source paths
- source path add / pause / resume / remove
- watcher resume on backend startup
- SQLite metadata storage
- document text extraction
- SQLite FTS search
- deterministic semantic-style local search
- admin-selected provider-based chat
- deterministic and provider-assisted insights/classifications
- duplicate detection
- folder watching
- durable Knowledge Base / Wiki pages
- category/topic knowledge navigation
- intelligent knowledge search
- page-level article search
- reading mode
- source reveal/open context actions
- source verification UX with citations, source cards, copy citation/path actions, preview drawer foundation, durable evidence routes, persisted source chunks, evidence quality badges, durable chunk metadata display, hardened active chunk matching, collapsed metadata details, responsive source preview drawer behavior, safer table/image rendering, clearer local settings guidance, and extracted frontend connection-settings state
- organization suggestions
- provider-backed planning suggestions
- planning-rule enforcement
- safe action previews
- approved move/rename execution
- undo
- audit log
- recovery/trash/restore
- Client Workspace / Admin Dashboard separation
- admin-only AI Provider Configuration
- admin-only Agent Connectors
- connector detection/version-probe history
- CI smoke-test pipeline
- Playwright smoke-test agent

## Not part of local MVP finalization

The following items are intentionally deferred to the production-platform phase:

- PostgreSQL migration
- pgvector/Qdrant production vector store
- multi-user tenant model
- central client/server sync
- installed remote client agent
- SaaS deployment
- Windows installer
- enterprise permission model
- production-grade secure credential storage

## Finalization phases

### Phase 1 — Stabilization

Status: complete / historically validated

Key historical validation:

```text
2026-05-21: Windows local UI smoke test passed.
2026-05-21: Backend test baseline passed at 82/82.
2026-06-13: Current backend test baseline passed at 113/113.
2026-06-13: Phase 8.2 CI Smoke Test Integration completed.
```

### Phase 2 — Scanner optimization

Status: complete for local MVP / validated

Completed:

- [x] Add configurable max file size
- [x] Add configurable exclude names
- [x] Add configurable exclude extensions
- [x] Track skipped reasons
- [x] Add progress callback support
- [x] Add persisted unchanged-file skip strategy
- [x] Validate scanner regression coverage through backend tests

Remaining:

- [ ] Add clearer scan report in UI if needed after product review

### Phase 3 — Watcher optimization

Status: complete for local MVP / validated

Completed:

- [x] Add debounce
- [x] Prevent overlapping rescans
- [x] Add queued pending rerun handling
- [x] Fix watcher cycles to use the caller database path instead of the default database path
- [x] Persisted active source paths selected for restart resume
- [x] Resume persisted watchers on backend startup
- [x] Report failed persisted source paths without aborting remaining resumes
- [x] Validate watcher behavior through backend tests

Remaining:

- [ ] Add richer UI status for watcher queue/running state if needed

### Phase 4 — Extraction, embeddings, and durable Knowledge Base

Status: complete for local MVP / validated

Completed:

- [x] Skip unchanged already-extracted files by default
- [x] Add force extraction option internally
- [x] Generate content-first wiki pages from extracted text
- [x] Generate chunk-level wiki citation markers such as `[S1:C3]`
- [x] Add persistent Wiki/Knowledge Base technical design for durable pages, sections, sources, chunks, relations, and rebuilds
- [x] Add durable Wiki schema tables for pages, sections, sources, chunks, relations, and rebuilds
- [x] Add durable Wiki repository read/write helpers
- [x] Add durable Wiki evidence API routes
- [x] Add backend tests for durable Wiki persistence and evidence routes
- [x] Add frontend TypeScript contracts and API helpers for durable Wiki evidence
- [x] Avoid regenerating embeddings for unchanged extracted text
- [x] Add PDF page-level source references where extractor can provide page metadata

Remaining:

- [x] Add future provider interface for real neural embeddings
- [ ] Improve rich media/table/OCR extraction where useful
- [ ] Evaluate OpenDataLoader PDF only as an optional connector if it clearly adds new extraction value

### Phase 5 — Safety hardening

Status: complete / validated

Completed:

- [x] Keep delete actions disabled
- [x] Keep move/rename behind preview + explicit approval
- [x] Add stronger filesystem execution validation
- [x] Audit failed execution attempts
- [x] Add backend reveal-source-file route for local source opening
- [x] Add nested undo regression test
- [x] Add failed execution regression test
- [x] Add trash/restore behavior
- [x] Block permanent purge in local MVP
- [x] Add execution batches with approval and audit
- [x] Add Undo UI

### Phase 6 — Client/Admin UI polish and Knowledge UX

Status: complete for local MVP / smoke-tested

Completed:

- [x] Split user-facing safe Client Workspace from Admin Dashboard
- [x] Keep official user UI on `apps/everything-ai-ui` / `UserApp.tsx`
- [x] Add Client Workspace navigation: Home / Sources & Files / Knowledge Base / Ask AI
- [x] Add Admin Dashboard navigation: Dashboard / Files & Content / Planning / Ask AI / Analytics / Settings
- [x] Add clear `CLIENT WORKSPACE` and `ADMIN DASHBOARD` labels
- [x] Add source-backed Knowledge Base view
- [x] Add content-first file wiki pages
- [x] Add category/topic/source-file tree navigation
- [x] Add intelligent Knowledge Base search across titles, topics, page content, sources, and snippets
- [x] Add page-level search inside selected knowledge article with match count and highlighted matches
- [x] Add Reading Mode for cleaner article reading
- [x] Add clickable `[[Related Page]]` navigation
- [x] Add source rail with file path, source context, and reveal-in-folder action
- [x] Add toast notification system for important user-triggered actions
- [x] Render chunk-level citation badges such as `[S1:C3]`
- [x] Make citations clickable and highlight matching source cards
- [x] Add source card actions: preview source, copy citation, copy path, reveal in folder, and open source context
- [x] Add source preview drawer foundation for source metadata, evidence, path, and chunks
- [x] Separate article reading content from supporting metadata using Document Content and collapsed Document Details
- [x] Group About This Document, Extracted Entities, Related Pages, Sources, Source Locations, and Evidence Snippets into collapsed tabs
- [x] Add async Wiki rebuild orchestration panel with live progress, clear history, and help tooltips
- [x] Remove noisy success toasts from GET/polling requests
- [x] Add frontend types/API helpers for durable Wiki page, evidence, and chunk endpoints
- [x] Add Wiki evidence quality badges for source count, section count, citation coverage, weak-source warning, and source fingerprint
- [x] Add durable source/chunk metadata display in source preview drawer
- [x] Harden `[S1:Cx]` drawer matching by mapping both `ref` and durable `chunk_ref` to the same chunk element
- [x] Improve source preview drawer responsive layout for narrow screens
- [x] Add safer table/image rendering in wiki pages
- [x] Add clearer local settings instructions in Client Workspace views
- [x] Extract connection/folder settings state from `UserApp.tsx` into `useConnectionSettings`
- [x] Add Ask AI auto-scroll
- [x] Validate Client/Admin clarity with Playwright smoke test

Remaining:

- [ ] Continue controlled frontend modularization and cleanup of legacy admin paths
- [ ] Do not mix UX changes and workflow extraction in the same commit

### Phase 7 — Provider runtime and Admin Agent Connectors

Status: implemented and validated for local MVP configuration surface

Completed:

- [x] Admin-only AI Provider Configuration
- [x] Broad provider catalog: Ollama, OpenAI, Anthropic/Claude, OpenRouter, Cerebras, Mistral, Google AI, DeepSeek, Groq, xAI/Grok, Moonshot/Kimi, Together AI, Fireworks, Perplexity, Azure OpenAI, LM Studio, Custom OpenAI-compatible
- [x] Remote-provider enable/disable policy
- [x] Provider-specific error metadata
- [x] Client chat uses backend/admin-selected provider only
- [x] Public `/api/chat` no longer accepts request-body provider override
- [x] Admin Agent Connectors panel
- [x] Codex / Claude Code / OpenCode connector catalog entries
- [x] Kilo Code / Aider / Continue / Cline connector catalog entries
- [x] Agent bridge status, detect, detect-all, and version probe actions
- [x] Connector detection and controlled version probes completed for detected connectors
- [x] Disabled-by-default bridge safety model
- [x] Browser cannot submit arbitrary shell commands
- [x] Playwright smoke test confirms Agent Connectors are Admin-only

Remaining:

- [ ] Controlled connector-specific setup/testing for real local Codex install
- [ ] Controlled connector-specific setup/testing for real local Claude Code install
- [ ] Keep OpenCode documented as not installed / not on PATH until installed
- [ ] Keep Kilo Code, Aider, Continue, and Cline documented as not installed / not on PATH until installed
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true`
- [ ] Decide when/if to enable `EVERYTHINGAI_AGENT_CHAT_ENABLED=true`

### Phase 8 — Documentation finalization and CI smoke automation

Status: complete

Completed:

- [x] Add MVP finalization plan
- [x] Add known limitations document
- [x] Add current handover JSON for next AI agent
- [x] Add dedicated Wiki/Knowledge Base technical design doc
- [x] Link dedicated Wiki/Knowledge Base technical design doc from README
- [x] Add Playwright smoke-test agent documentation
- [x] Add validation notes for local smoke test and Admin Agent Connectors
- [x] Create consolidated June 7 source-of-truth handover
- [x] Create consolidated June 13 Phase 8.2 source-of-truth handover
- [x] Update README, ROADMAP, IMPLEMENTATION_ROADMAP, UI README, Windows smoke test, and MVP finalization docs to the June 13 validated baseline
- [x] Add GitHub Actions / CI workflow for backend tests
- [x] Add CI workflow for frontend typecheck/build
- [x] Add CI workflow for Playwright smoke test
- [x] Archive smoke screenshots/reports as CI artifacts

Remaining:

- [ ] Continue Phase 8.3 connector-specific setup/testing for installed Codex and Claude Code
- [ ] Continue release hardening and frontend modularization
- [ ] Improve API key lifecycle UX
- [ ] Improve rich citation/source highlighting and extracted document formatting

## Latest validation results

```text
Date: 2026-06-13

Backend:
cd C:\temp\EverythingAI\services\api
npm test
Result: 113 tests / 113 passed / 0 failed

Frontend:
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
Result: PASS

cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run build
Result: PASS

CI smoke pipeline:
.github/workflows/ci-smoke.yml
Result: implemented
Triggers: push -> main, pull_request -> main
Artifacts: playwright-report, test-results

Playwright smoke test:
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium --headed
Result: covered by CI smoke pipeline
```

## Runtime repair added during earlier validation

The May 21 Windows smoke test exposed schema drift in an older local SQLite database.

Observed missing-column failures:

```text
no such column: status
no such column: source_ref
no such column: page_source_id
```

Repair utility:

```text
services/api/src/db/repairWikiSchema.js
```

Manual repair command:

```text
cd C:\temp\EverythingAI\services\api
npm run repair:wiki-schema
```

Startup hardening:

```text
services/api/package.json
npm run dev and npm start run Wiki schema repair before API startup where configured.
```

## Environment variables for MVP optimization

```text
EVERYTHINGAI_MAX_FILE_SIZE_BYTES=262144000
EVERYTHINGAI_EXCLUDE_NAMES=node_modules,.git,dist,build
EVERYTHINGAI_EXCLUDE_EXTENSIONS=.exe,.dll,.iso,.zip
EVERYTHINGAI_WATCH_DEBOUNCE_MS=1000
EVERYTHINGAI_WIKI_FILE_CONTENT_LIMIT=50000
EVERYTHINGAI_WIKI_TOPIC_CONTENT_LIMIT=4000
```

## Definition of done

The local MVP finalization baseline is currently met when:

1. `npm test` passes locally in `services/api`. Current result: PASS, 113/113.
2. `npm run typecheck` passes in `apps/everything-ai-ui`. Current result: PASS.
3. `npm run build` passes in `apps/everything-ai-ui`. Current result: PASS.
4. CI smoke pipeline is implemented in `.github/workflows/ci-smoke.yml`.
5. Playwright smoke test is included in CI smoke pipeline.
6. Client Workspace and Admin Dashboard remain clearly separated.
7. Sources & Files and Knowledge Base remain clearly distinguished.
8. Client Workspace does not expose provider/API-key configuration.
9. Client Workspace does not expose Agent Connectors.
10. Client Ask AI uses the backend/admin-selected provider only.
11. Move/rename actions require preview and approval.
12. Failed action attempts are audited.
13. Undo works for supported filesystem actions and is audited.
14. README and smoke-test documentation match the tested behavior.

## Final MVP principle

The local MVP should be boring, safe, and reliable before adding more intelligence.

The Knowledge Base direction is confirmed: it should feel like a source-backed encyclopedia / book-reading layer over the user's local files, with content-first pages, strong navigation, intelligent search, page-level article search, source preview, evidence inspection, traceable citations, durable source chunks, rebuild history, visible evidence quality indicators, reliable citation-to-chunk navigation, collapsed metadata details, responsive source preview behavior, safer table/image rendering, clear local setup guidance, and gradually modularized frontend state.

Do not add production-platform features until the validated local MVP remains stable under automated tests and smoke tests.
