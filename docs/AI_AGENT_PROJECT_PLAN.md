# AI AGENT PROJECT PLAN

## Purpose

This document defines how AI agents should work on the EverythingAI / EverythingApp project.

EverythingApp is a centralized AI-powered file brain with local client agents. The system must support both installed clients and browser access, while centralizing metadata, knowledge, embeddings, search, AI reasoning, approvals, and audit logs on a main server.

## Current project status

The repository already contains:

- Product definition
- Technical architecture
- Client/server build plan
- MVP scope
- Roadmap
- Initial Node.js central API
- Initial local client-agent scanner

Current implementation state:

```text
services/api        → initial Express API with in-memory storage
apps/client-agent  → initial scanner that sends file metadata to API
```

## Agent operating rules

All AI agents working on this repository must follow these rules:

1. Work from the documentation in `/docs` before changing code.
2. Do not remove existing project direction unless explicitly instructed.
3. Keep the architecture centralized: client agent + central server + browser UI.
4. Never implement silent destructive file actions.
5. File move, rename, and delete actions must follow:

```text
Suggest → Preview → Approve → Execute → Log → Undo possible
```

6. Every code change must reference the exact file path.
7. Prefer small, reviewable changes.
8. Keep the MVP focused.
9. Do not add cloud-only dependencies for the core system.
10. Local-first and privacy-first must remain core principles.

## Agent team roles

### Agent 1 — Product & Documentation Agent

Responsibilities:

- Maintain product specs
- Keep roadmap updated
- Convert decisions into documentation
- Ensure implementation matches the defined vision

Main files:

```text
docs/PROJECT_OVERVIEW.md
docs/PRODUCT_SPEC.md
docs/MVP_SCOPE.md
docs/ROADMAP.md
docs/DECISIONS.md
```

### Agent 2 — Backend API Agent

Responsibilities:

- Build central API
- Add persistent database
- Add device registration
- Add file metadata ingestion
- Add authentication
- Add tenant/workspace structure

Main files:

```text
services/api/package.json
services/api/src/server.js
services/api/src/routes/*
services/api/src/db/*
services/api/src/middleware/*
```

### Agent 3 — Client Agent Agent

Responsibilities:

- Improve local scanner
- Add folder permission configuration
- Add file watcher
- Add batching
- Add retry queue
- Add local action executor

Main files:

```text
apps/client-agent/src/index.js
apps/client-agent/src/scanner/*
apps/client-agent/src/sync/*
apps/client-agent/src/executor/*
```

### Agent 4 — Database & Data Model Agent

Responsibilities:

- Add PostgreSQL persistence
- Add Prisma or equivalent ORM
- Implement schema based on `docs/DATA_MODEL.md`
- Add migrations
- Add seed/demo data

Main files:

```text
services/api/prisma/schema.prisma
services/api/src/db/*
infra/database/*
docs/DATA_MODEL.md
```

### Agent 5 — Search & Indexing Agent

Responsibilities:

- Add keyword search
- Add Meilisearch or OpenSearch integration
- Add filename/path/content indexing
- Add search endpoints

Main files:

```text
services/api/src/search/*
services/api/src/routes/search.routes.js
infra/docker/*
```

### Agent 6 — AI/RAG Agent

Responsibilities:

- Add document parsing pipeline
- Add embeddings
- Add semantic search
- Add AnythingLLM integration strategy
- Add Ollama/local LLM support

Main files:

```text
services/ai/*
services/worker/*
docs/ANYTHINGLLM_FORK_STRATEGY.md
docs/TECHNICAL_ARCHITECTURE.md
```

### Agent 7 — UI Agent

Responsibilities:

- Build browser dashboard
- Show connected devices
- Show indexed files
- Add search UI
- Add action preview UI

Main files:

```text
apps/web/*
packages/types/*
packages/shared/*
```

### Agent 8 — Safety & QA Agent

Responsibilities:

- Ensure safe file operations
- Add tests
- Add validation
- Review risky code
- Ensure no destructive automation is introduced

Main files:

```text
docs/SECURITY_AND_FILE_SAFETY.md
apps/client-agent/src/executor/*
services/api/src/actions/*
tests/*
```

## Phase 1 — Stabilize foundation

Goal: turn the current prototype into a clean base.

Tasks:

- [ ] Split `services/api/src/server.js` into routes, middleware, and store modules.
- [ ] Add basic config handling.
- [ ] Add request validation.
- [ ] Add consistent API response format.
- [ ] Add a root-level README section for running API and client agent.
- [ ] Add `.gitignore`.

Expected result:

```text
API and client-agent can run locally with clear instructions.
```

## Phase 2 — Add persistent database

Goal: replace in-memory storage with PostgreSQL.

Tasks:

- [ ] Add PostgreSQL database.
- [ ] Add Prisma ORM.
- [ ] Create schema for devices and files.
- [ ] Add migrations.
- [ ] Update API to persist devices and files.
- [ ] Add database setup instructions.

Expected result:

```text
Indexed file metadata remains after API restart.
```

## Phase 3 — Improve client agent

Goal: make client-agent reliable enough for real folder scanning.

Tasks:

- [ ] Add scan configuration file.
- [ ] Add exclude rules.
- [ ] Add batching for file uploads.
- [ ] Add error handling and retry queue.
- [ ] Add file watcher for changes.
- [ ] Avoid hashing very large files without limits.

Expected result:

```text
Client agent can scan and sync a real folder safely.
```

## Phase 4 — Browser dashboard

Goal: create first web interface.

Tasks:

- [ ] Create `apps/web` React app.
- [ ] Add dashboard layout.
- [ ] Show connected devices.
- [ ] Show indexed files.
- [ ] Add simple filename/path search.
- [ ] Add file detail page.

Expected result:

```text
User can access the system by browser and see indexed files from the client agent.
```

## Phase 5 — Content extraction

Goal: move beyond metadata and start extracting knowledge.

Tasks:

- [ ] Add worker service.
- [ ] Add document parsing pipeline.
- [ ] Support TXT, MD, CSV first.
- [ ] Add PDF and DOCX later.
- [ ] Store extracted text chunks.

Expected result:

```text
Server can store searchable document text.
```

## Phase 6 — AI search and chat

Goal: add AI intelligence.

Tasks:

- [ ] Add embeddings.
- [ ] Add pgvector support.
- [ ] Add semantic search endpoint.
- [ ] Add Ollama integration.
- [ ] Add basic chat endpoint with source references.

Expected result:

```text
User can ask questions about indexed documents and get referenced answers.
```

## Phase 7 — AI organization engine

Goal: add the unique EverythingApp differentiator.

Tasks:

- [ ] Add tag suggestions.
- [ ] Add filename suggestions.
- [ ] Add folder suggestions.
- [ ] Add confidence score.
- [ ] Add action proposal database table.
- [ ] Add approval workflow.

Expected result:

```text
System suggests organization actions but does not execute them automatically.
```

## Phase 8 — Safe local execution

Goal: allow approved actions to be executed by the installed client.

Tasks:

- [ ] Add command queue on server.
- [ ] Add client polling or websocket.
- [ ] Add local move/rename executor.
- [ ] Add execution result reporting.
- [ ] Add undo records.
- [ ] Add audit log.

Expected result:

```text
Approved file actions can be executed safely by the client agent.
```

## Recommended immediate tasks for agents

### Task 1

Refactor `services/api/src/server.js` into a clean Express structure.

### Task 2

Add `.gitignore` and local setup instructions.

### Task 3

Add PostgreSQL + Prisma design without changing runtime behavior yet.

### Task 4

Improve `apps/client-agent/src/index.js` with batching and excludes.

### Task 5

Create `apps/web` initial dashboard skeleton.

## Branching strategy

Agents should work in separate branches:

```text
agent/backend-api-foundation
agent/client-agent-scanner
agent/database-prisma
agent/web-dashboard
agent/docs-product
agent/safety-review
```

## Pull request rules

Each PR must include:

- What was changed
- Files changed
- How to test
- Risks
- Next recommended step

## Definition of done for Phase 2 MVP foundation

The foundation is done when:

1. API runs locally.
2. Client agent scans a folder.
3. Metadata is stored in PostgreSQL.
4. Browser UI can list files.
5. No file action is executed automatically.
