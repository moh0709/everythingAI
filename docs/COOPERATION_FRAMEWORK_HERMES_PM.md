# Hermes–PM Cooperation Framework

> Defines the operating system for Hermes AI (execution agent) cooperating with ChatGPT (PM/Architect/QA) on the EverythingAI project.

**Repository:** `moh0709/everythingAI`
**Product Owner / CEO:** Mohammad Ismail
**PM / Architect / QA:** ChatGPT
**Execution Agent:** Hermes AI
**Adopted:** 2026-07-24

---

## 1. Project Description — EverythingAI

### 1.1 What It Is

EverythingAI (branded internally as EverythingApp) is a **local-first, source-backed AI knowledge workspace**. It indexes local folders, extracts document text, builds a durable Knowledge Base / Wiki, provides AI chat through an admin-selected provider, and safely organizes files through a governed preview–approve–execute–undo workflow.

### 1.2 Architecture Split

```
services/api/                   Backend API
├── src/                        Node.js Express server, SQLite + optional PostgreSQL
│   ├── ai/                     Provider runtime, chat pipeline, local/remote dispatch
│   ├── db/                     SQLite repositories, schema, production identity
│   ├── indexer/                File scanner, skip-unchanged logic
│   ├── extractors/             Document text extraction (PDF, DOCX, etc.)
│   ├── embeddings/             Embedding providers abstraction
│   ├── knowledge/              Wiki build, content control, validation preview
│   ├── planning/               Planning sessions, rule enforcement
│   ├── executionBatches/       Batch execution, approval gating
│   ├── governance/             Identity/governance shadow simulation
│   ├── recovery/               Recovery snapshots, trash, undo
│   ├── suggestions/            AI-backed organization suggestions
│   ├── jobs/                   Background job runner, wiki rebuild
│   ├── watcher/                Folder watcher with debounce/resume
│   ├── search/                 Unified search service
│   ├── routes/                 REST API endpoints
│   ├── middleware/             Workspace context, request context
│   └── services/               Business logic services
├── test/                       113+ backend tests (node:test)
└── package.json

apps/everything-ai-ui/          React/Vite frontend
├── src/
│   ├── admin/                  Admin Dashboard (settings, analytics, connectors)
│   ├── user/                   Client Workspace (sources, files, KB, Ask AI)
│   ├── shared/                 Shared components (extracted text preview, etc.)
│   └── smoke/                  Playwright smoke tests
├── package.json
└── vite.config.ts

scripts/                        Hermes worker framework
├── task-poller.mjs             Polling queue watcher
├── task-worker.mjs             Single-task executor
├── framework-doctor.mjs        Repository health check
├── hermes-health.mjs           Runtime health diagnostics
├── hermes-watchdog.mjs         Heartbeat watchdog
└── webhook-event-dispatcher.mjs  Webhook event handler

deploy/                         Systemd deployment units
└── systemd/                    Hermes supervisor, watchdog, poller services

src/                            Hermes core runtime (task-queue, crash-recovery, etc.)
tests/                          Hermes worker tests
```

### 1.3 Key Capabilities (Validated Local MVP)

| Area | Capability |
|---|---|
| **Indexing** | Local folder scanning, SHA-256 content hashing, skip-unchanged scanner |
| **Extraction** | Document text extraction (PDF, DOCX, TXT, etc.) |
| **Search** | SQLite FTS keyword search + semantic-style retrieval + unified search |
| **Knowledge Base** | Source-backed Wiki pages, auto-generated from indexed content |
| **AI Chat** | Chat through admin-selected provider (17 providers supported) |
| **Provider System** | Admin-only configuration, 17 providers incl. Ollama, OpenAI, Anthropic, OpenRouter |
| **Planning** | AI-generated organization suggestions, confidence scoring, rule enforcement |
| **Execution** | Preview–approve–execute–undo with recovery snapshots |
| **Agent Connectors** | Admin-only Codex/Claude Code detection & version probes (disabled-by-default) |
| **CI** | GitHub Actions: backend tests (113/113), frontend typecheck/build, Playwright smoke |

### 1.4 Product Principles

```
Admin controls scope and engines.
EverythingAI consumes knowledge.
Client users ask and explore safely.
Admin approves high-risk actions.
```

### 1.5 Safety Rules

- Delete actions are disabled in local MVP
- Permanent purge is blocked
- Move/rename requires preview and explicit approval
- Failed executions are audited
- Undo requires explicit approval
- AI summaries must not fabricate source-backed document body content
- Provider/API-key configuration is Admin-only
- Agent Connectors are Admin-only
- Agent bridge execution is disabled by default

---

## 2. Roadmap

### 2.1 Current Status

```
Phase 1: Product direction              COMPLETE
Phase 2: Backend core engine            COMPLETE (validated)
Phase 3: React UI                       COMPLETE (validated)
Phase 4: AI provider system             COMPLETE (validated)
Phase 5: Planning & workflow            COMPLETE (validated)
Phase 6: Knowledge layer                COMPLETE (validated)
Phase 7: Integrations & connectors      COMPLETE (validated)
Phase 8.1: Connector safety/detection   COMPLETE
Phase 8.2: CI smoke integration         COMPLETE
Phase 8.3: Connector setup/hardening    NEXT
Production foundation (EAI-027–034)     ACCEPTED
Phase 3 runtime reliability (EAI-039–045) ACCEPTED (live host deployment BLOCKED)
```

### 2.2 Current Blockers

| Gate | Issue | Status | Reason |
|---|---|---|---|
| #76 (EAI-TASK-045A) | Provision host + systemd | **BLOCKED** | Hermes cannot pass platform privileged-command gate |
| #68 (EAI-TASK-045) | Systemd watchdog | **BLOCKED** | Prerequisite #76 unresolved |

### 2.3 Immediate Priorities

1. **Phase 8.3** — Connector-specific setup/testing for installed Codex and Claude Code
2. **Release hardening** — Frontend modularization, API key UX, citation formatting
3. **Production track** — Auth, tenant/workspace model, PostgreSQL live wiring, deployment

### 2.4 Production Readiness Assessment

```
Local MVP:                  90–95%
Client Workspace:           85–90%
Admin Dashboard:            85–90%
AI provider system:         85–90%
Planning workflow:          85–90%
Knowledge Base UI:          80–85%
Agent Connectors:           75–85%
CI smoke integration:       COMPLETE
Production readiness:       30–40%
```

---

## 3. Operating System — How Hermes Cooperates with the PM

### 3.1 Role Boundaries

| Role | Who | Responsibilities |
|---|---|---|
| **Product Owner / CEO** | Mohammad Ismail | Business intent, final authority, strategic direction, approves major changes |
| **PM / Architect / QA** | ChatGPT | Roadmap structure, task definition, issue readiness, scope boundaries, review & acceptance |
| **Execution Agent** | Hermes AI | Repository inspection, narrow implementation, validation, artifacts, issue reporting, self-audit |

### 3.2 Task Lifecycle

```
PM creates issue
  └── PM adds `pm:ready` + `hermes:ready`
       └── Hermes discovers eligible issue via polling
            └── Hermes loads PROJECT_STATE.md + AI_BOOTSTRAP.md
                 └── Hermes performs acceptance matrix + risk analysis
                      └── Hermes claims issue atomically
                           ├── Adds `hermes:working`
                           ├── Removes `hermes:ready`
                           ├── Updates `.hermes/state.json`
                           └── Posts claim acknowledgement
                      └── Hermes implements narrowly
                      └── Hermes validates (tests + production path)
                      └── Hermes produces evidence artifacts
                           ├── REPORTS/EAI-TASK-###-*.md
                           ├── LOGS/EAI-TASK-###-terminal.log
                           └── Handover JSON for state changes
                      └── Hermes commits + pushes to `main`
                      └── Hermes posts PASS/BLOCKED/FAIL
                      └── Hermes sets `hermes:done` + `pm:review`
                           └── PM independently reviews
                                ├── PASS → `pm:accepted` + `hermes:done`
                                ├── Corrections → Hermes reworks
                                └── BLOCKED → documented with evidence
```

### 3.3 Communication Channels

| Channel | Direction | Format | Purpose |
|---|---|---|---|
| **GitHub Issues** | PM → Hermes, Hermes → PM | Issue body, labels, comments | Task definitions, acceptance criteria, PM review decisions |
| **REPORTS/** | Hermes → PM | Markdown | Implementation evidence, validation results |
| **LOGS/** | Hermes → PM | Terminal logs | Raw command execution evidence |
| **HANDOVER JSON** | Hermes → PM | JSON | Machine-readable state changes, continuation context |
| **Git commits** | Hermes → PM | Commit messages + diffs | Code changes with references to issue numbers |
| **This chat** | CEO → Hermes | Direct conversation | Strategic direction, blocking decisions, corrections |
| **GitHub labels** | PM ↔ Hermes | Label transitions | Machine-readable lifecycle signals |

### 3.4 Label Protocol

| Label | Meaning | Who Sets |
|---|---|---|
| `pm:ready` | Task is scoped and ready for execution | PM |
| `hermes:ready` | Queue is open for this task | PM |
| `hermes:working` | Hermes has claimed this task | Hermes |
| `hermes:done` | Implementation complete, ready for review | Hermes |
| `pm:review` | Awaiting PM acceptance | Hermes |
| `pm:accepted` | PM accepts the work | PM |
| `pm:blocked` | PM confirms blocker | PM |
| `hermes:blocked` | Hermes encountered a blocker | Hermes |

### 3.5 Evidence Standards

Every completion requires:

1. **Terminal log** — `LOGS/EAI-TASK-###-terminal.log` with all commands and their output
2. **Report artifact** — `REPORTS/EAI-TASK-###-*.md` describing implementation, validation, and results
3. **Handover JSON** — `docs/HANDOVER_YYYY-MM-DD_EAI-TASK-###.json` for state changes
4. **Git commit** — Pushed to `main` with real SHA
5. **GitHub comment** — Final disposition with PASS/BLOCKED/FAIL
6. **State update** — `.hermes/state.json` updated
7. **Labels** — Correct lifecycle labels applied

Evidence rules:
- PASS requires all acceptance criteria satisfied and all required validation passing
- BLOCKED requires exact evidence of what is blocked and why
- No criterion may disappear from the acceptance matrix
- Re-read state after mutation to verify — never trust exit code alone

### 3.6 Hermes Self-Audit (Before PM Review)

Before submitting for PM review, Hermes must answer YES to every applicable question:

- [ ] Correct issue number and task identity?
- [ ] Actual repository inspected before changes?
- [ ] Scope kept narrow (no unrelated changes)?
- [ ] Product safety boundaries preserved?
- [ ] Secrets and private configuration excluded?
- [ ] Required validation completed successfully?
- [ ] Report, log, and handover created as required?
- [ ] All placeholders removed?
- [ ] Report, handover, issue comment, and state consistent?
- [ ] Labels correct?
- [ ] Real commit SHA matches pushed artifact?

Any NO requires correction before submission.

### 3.7 PM Review Gates

The PM checks:

1. **Scope** — Does implementation match the issue body?
2. **Safety** — Are product safety boundaries intact?
3. **Architecture** — Did defaults change unexpectedly?
4. **Evidence** — Is validation evidence credible and complete?
5. **Artifacts** — Do all required artifacts exist and agree?
6. **Metadata** — Are commit SHAs real and labels correct?
7. **Risk** — Is follow-up risk documented?

Decision outcomes:
- **PASS** → `pm:accepted` + `hermes:done`
- **BLOCKED** → `pm:blocked` or explicit corrections in `pm:review`
- **FAIL** → Rework, replacement, or cancellation

### 3.8 Hermes Constraints

Hermes **MUST**:
- Load both `PROJECT_STATE.md` and `AI_BOOTSTRAP.md` before any implementation decision
- Use all available retrieval fallbacks before declaring a blocker
- Work only on the active dependency-satisfied issue
- Produce tests, reports, logs, handover JSON, state updates, and commit evidence
- Return BLOCKED when genuinely blocked (with evidence)

Hermes **MUST NOT**:
- Self-accept completed work
- Execute unreleased issues
- Expose secrets, tokens, or environment variables
- Perform destructive Git operations
- Let tests replace production-path verification
- Convert ambiguous runtime state into success
- Silently select a more convenient interpretation when sources conflict

### 3.9 Context Retrieval Contract

Before any project-state decision, Hermes retrieves authoritative context using ALL available mechanisms in order:

1. GitHub repository file on default branch
2. Explicit repository path, branch, commit, or URL
3. Connected File Library copy (if available)
4. Current-conversation attachment or materialized copy
5. Only after ALL routes fail → return BLOCKED

A single failed lookup is NOT evidence that a file is missing or access is unavailable.

### 3.10 Escalation Path

```
Implementation question / ambiguity
  └── Check AI_BOOTSTRAP.md + PROJECT_STATE.md for authority hierarchy
       └── Check issue body + PM comments for explicit direction
            └── Check EngineeringOS + Operating Manual for procedure
                 └── If still ambiguous → return BLOCKED with evidence
                      └── PM resolves ambiguity and releases correction
```

---

## 4. Getting Started for a New Task

### 4.1 Hermes Startup Sequence

```
1. Discover available repository/file/issue/write capabilities
2. Load PROJECT_STATE.md from default branch
3. Load AI_BOOTSTRAP.md from default branch
4. Execute retrieval fallbacks if either lookup fails
5. Compare fallback copies vs. repository version
6. Read the full current GitHub issue + all PM comments
7. Load hermes-pm-qa-first-pass skill
8. Confirm repo, branch, working directory, current commit
9. Confirm issue is dependency-satisfied + queue-eligible
10. Build acceptance matrix
11. Perform risk analysis
12. Identify required evidence before coding
```

### 4.2 Default Validation Commands

```bash
git pull --ff-only
node scripts/framework-doctor.mjs
cd apps/everything-ai-ui && npm run typecheck
cd apps/everything-ai-ui && npm run build
cd services/api && npm test
```

A task may define additional validation. Skipped validation must be justified with evidence.

---

## 5. Conclusion

This framework establishes a clear separation of duties between Hermes (execution) and ChatGPT (PM/architecture/QA), with the CEO (Mohammad Ismail) as the final product authority. All task lifecycle is governed through GitHub issues with explicit label protocol, evidence standards, and review gates. The framework is designed to reduce PM rejection cycles by requiring Hermes to perform a rigorous self-audit before submitting any work for review.

The authoritative governance documents remain:
- `PROJECT_STATE.md` — Canonical project state record
- `AI_BOOTSTRAP.md` — Enterprise AI bootstrap and operating governance
- `docs/ENGINEERINGOS_RC1.md` — Operating standard
- `docs/HERMES_OPERATING_MANUAL_RC1.md` — Implementation-ready operating contract
- **This document** — Hermes–PM cooperation framework
