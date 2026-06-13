# Enterprise Implementation Roadmap

## Purpose

This roadmap converts the enterprise architecture into an executable build sequence while preserving the current validated local MVP as the proving ground.

The project should prioritize disciplined implementation over more conceptual expansion.

## Current execution reality

As of 2026-06-13, EverythingAI is not starting from Sprint 1 anymore and is not merely an unvalidated prototype. The local MVP has been validated through backend tests, frontend typecheck/build, connector detection/version probes, and CI smoke-test integration.

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
Connector probes:        Codex and Claude Code PASS
```

Current confirmed direction:

```text
local files
  -> indexing
  -> extraction
  -> source-backed Knowledge Base
  -> Client Workspace for safe exploration/chat
  -> Admin Dashboard for providers, planning, source paths, and connectors
  -> governed planning preview/execution/undo
  -> admin-only agent connector configuration
```

Current active priority:

```text
harden the validated local MVP with Phase 8.3 connector-specific setup, release hardening, and controlled frontend cleanup before expanding into enterprise production-platform architecture
```

The enterprise roadmap below remains the strategic target, but the immediate execution path is now focused on Phase 8.3 connector-specific setup, release hardening, CI-aligned validation, and controlled frontend cleanup.

## Core implementation principle

Build and preserve one end-to-end loop before expanding.

The current working local system supports:

```text
index local files
  -> extract content
  -> search Sources & Files
  -> generate source-backed Knowledge Base pages
  -> inspect source references
  -> chat through admin-selected AI provider
  -> generate governed organization plan
  -> simulate/dry-run plan
  -> approve plan
  -> execute safely
  -> undo/restore where supported
  -> monitor health and diagnostics
```

## Sprint 1 — Repository, auth, storage, and upload foundation

Strategic enterprise target:

```text
monorepo foundation
auth shell
tenant/workspace model
object storage
file upload
file registry
basic audit events
```

Current local MVP status:

```text
Partially superseded by local-first source-path model
```

Local MVP already validates file registry, source paths, audit events, and local SQLite storage. Production auth, tenant/workspace model, and object storage remain future enterprise work.

## Sprint 2 — Ingestion, extraction, and CIIF baseline

Strategic enterprise target:

```text
file type detection
PDF/DOCX/TXT/CSV/XLSX extraction
PNG/JPG OCR baseline
normalized document contract
chunk creation
```

Current local MVP status:

```text
Mostly implemented and validated for supported local MVP extraction paths
```

Validated / implemented:

- [x] Local folder scanning.
- [x] File metadata registry.
- [x] Content hashing.
- [x] Extraction status tracking.
- [x] Text extraction for supported readable file types.
- [x] Failed extraction reporting.
- [x] Source references.
- [x] Wiki source chunks with page numbers when extraction metadata provides a page map.

Remaining:

- [ ] Richer media/table/OCR extraction.
- [ ] Optional OpenDataLoader PDF connector only if it adds clear new extraction value.
- [ ] Production-grade normalized CIIF contract later.

## Sprint 3 — Search & Explore Knowledge Base

Strategic enterprise target:

```text
keyword search
semantic/vector search
search result cards
source references
knowledge areas
semantic collections baseline
content-first wiki pages
category/topic navigation
source-backed reading mode
```

Current local MVP status:

```text
Implemented and smoke-tested in Client Workspace
```

Validated / implemented:

- [x] Client Workspace.
- [x] Sources & Files page.
- [x] Knowledge Base page.
- [x] Ask AI page.
- [x] Clear distinction between raw indexed file content and saved/generated Knowledge Base.
- [x] Search indexed files.
- [x] Document context / preview.
- [x] Durable Knowledge Base / Wiki pages.
- [x] Knowledge map/navigation.
- [x] Source references and source chunks.
- [x] Ask AI auto-scroll.
- [x] Playwright smoke test covers Client Workspace clarity.

Remaining:

- [ ] Improve rich citation rendering and source highlighting where needed.
- [ ] Improve extracted document formatting for book/blog-like reading.

## Sprint 4 — Planning Center and simulation

Strategic enterprise target:

```text
organization plans
duplicate cleanup plans
canonical document suggestions
simulation results
blast-radius panel
before/after preview
```

Current local MVP status:

```text
Implemented and validated as governed local planning workflow
```

Validated / implemented:

- [x] Deterministic organization suggestions.
- [x] Provider-backed planning suggestions.
- [x] Deterministic/provider/hybrid planning sessions.
- [x] Backend planning-rule enforcement.
- [x] Confidence threshold enforcement.
- [x] Allow/disable action-type enforcement.
- [x] Dry-run preview queue.
- [x] Blocked preview explanations.
- [x] Approval-gated execution.
- [x] Planning UI smoke coverage.

Remaining:

- [ ] Better grouped folder-structure planning view.
- [ ] Better bulk select controls.
- [ ] More manual QA for move/rename flows on disposable folders.

## Sprint 5 — Governed execution and recovery

Strategic enterprise target:

```text
approval workflow
execution lock
recovery snapshot
bounded internal file actions
trashbin
restore
rollback simulation
```

Current local MVP status:

```text
Implemented and backend validated
```

Validated / implemented:

- [x] Approval-gated execution.
- [x] Recovery snapshots for filesystem mutations.
- [x] Undo for supported filesystem actions.
- [x] Undo UI.
- [x] Trash/restore behavior.
- [x] Permanent purge blocking.
- [x] Failed execution auditing.
- [x] Execution batches.

Remaining:

- [ ] More user-facing Recovery Center polish later.
- [ ] Production execution locks and permissions later.

## Sprint 6 — Operations Center, diagnostics, and governance visibility

Strategic enterprise target:

```text
manual tickets
AI-generated tickets
extraction failure tickets
runtime health signals
health signal panels
improvement proposals
```

Current local MVP status:

```text
Diagnostics and governance visibility implemented through Phase 7.6 work
```

Validated / implemented:

- [x] Workspace Trust Health.
- [x] Knowledge Quality Scoring.
- [x] Human Validation Layer.
- [x] Review Coverage.
- [x] Governance Conflict Detection Engine.
- [x] Review Candidate Detection Engine.
- [x] Governance Conflict Dashboard.
- [x] Review Candidate Dashboard.
- [x] Conflict/review badges in Knowledge Quality list.
- [x] Backend diagnostics support.
- [x] Frontend diagnostics type support.

Remaining:

- [ ] Production-grade ticketing/operations center later.
- [ ] CI alerts/reporting later.

## Sprint 7 — Admin Console, providers, and Agent Connectors

Strategic enterprise target:

```text
core KPIs
health scores
insight recommendations
role/page/capability control
AI permissions
retention/source mode settings
admin-controlled engines/connectors
```

Current local MVP status:

```text
Admin Dashboard implemented; Agent Connectors validated as admin-only configuration surface with detection/version-probe history
```

Validated / implemented:

- [x] Admin Dashboard.
- [x] Admin-only AI Provider Configuration.
- [x] Remote-provider policy.
- [x] Broad provider catalog: Ollama, OpenAI, Anthropic/Claude, OpenRouter, Cerebras, Mistral, Google AI, DeepSeek, Groq, xAI/Grok, Moonshot/Kimi, Together AI, Fireworks, Perplexity, Azure OpenAI, LM Studio, Custom OpenAI-compatible.
- [x] Client chat uses backend/admin-selected provider only.
- [x] Public `/api/chat` route no longer accepts provider override.
- [x] Admin Agent Connectors panel.
- [x] Codex, Claude Code, OpenCode connector entries.
- [x] Agent bridge status, detect, detect-all, and version probe actions.
- [x] Connector detection and controlled version probes completed for detected connectors.
- [x] Disabled-by-default bridge safety model.
- [x] Browser cannot submit arbitrary shell commands.
- [x] Client Workspace does not expose Agent Connectors.

Remaining:

- [ ] Controlled connector-specific setup/testing for real local Codex.
- [ ] Controlled connector-specific setup/testing for real local Claude Code.
- [ ] Keep OpenCode documented as not installed / not on PATH until installed.
- [ ] Decide when/if to enable bridge/chat environment flags locally.
- [ ] Production role/page/capability control later.

## Sprint 8 — UX polish, launch hardening, and documentation

Strategic enterprise target:

```text
Apple-style UI refinement
empty states
trust indicators
onboarding polish
security validation
release checklist
smoke tests
```

Current local MVP status:

```text
Smoke-tested, CI smoke pipeline documented, and documentation refreshed
```

Validated / implemented:

- [x] Client/Admin labeling.
- [x] Sources & Files vs Knowledge Base clarity.
- [x] Ask AI auto-scroll.
- [x] Playwright smoke-test agent.
- [x] Local smoke-test report.
- [x] Validation addenda.
- [x] Consolidated handover.
- [x] Phase 8.2 CI smoke-test integration.

Remaining:

- [ ] Continue UI polish after broader product review.
- [ ] Update release checklist for Phase 8.3.

## Engineering rules

Every sprint must preserve:

```text
safe user/admin separation
admin-only provider/API-key configuration
admin-only Agent Connectors
backend permission enforcement
audit events
recovery path for destructive actions
source references
clear UX feedback
no destructive workflows in the ordinary Client Workspace
no trust-score or quality-score changes without explicit governance approval
no arbitrary browser-submitted shell commands
```

## Immediate next implementation priorities

```text
1. Phase 8.3 connector-specific setup/testing for installed Codex and Claude Code
2. Continue frontend modularization / cleanup of legacy admin paths
3. Improve API key lifecycle UX: saved / replace / clear
4. Improve rich citations, source highlighting, and extracted document formatting
5. Keep AnythingLLM and OpenDataLoader PDF optional unless they add clear new value
```

## Strategic outcome

This roadmap converts EverythingAI from architecture into a buildable enterprise product:

```text
Governed Enterprise Cognitive Workspace
```

The validated local MVP currently proves the most important product principle:

```text
A safe, source-backed AI file brain that turns local files into searchable, readable, trusted knowledge while keeping engine/provider/agent control in the Admin Dashboard.
```
