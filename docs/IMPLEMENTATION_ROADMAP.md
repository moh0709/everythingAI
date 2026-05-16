# Enterprise Implementation Roadmap

## Purpose

This roadmap converts the enterprise architecture into an executable MVP build sequence.

The project should prioritize disciplined implementation over more conceptual expansion.

## Current execution reality

As of the latest local MVP work, the project is not starting from Sprint 1 anymore. The backend local MVP foundation is already strong, and the active bottleneck is the **user-facing product experience**, especially the source-backed Wiki / Knowledge Base layer.

Current confirmed direction:

```text
local files
  -> indexing
  -> extraction
  -> content-first wiki generation
  -> category/topic knowledge navigation
  -> intelligent wiki search
  -> source-backed reading mode
  -> safe source inspection
```

Current active priority:

```text
finish the local user MVP experience before expanding into enterprise production-platform architecture
```

The enterprise roadmap below remains the strategic target, but the immediate execution path is now focused on the local MVP user experience and Wiki/Knowledge Base quality.

## Core implementation principle

Build one end-to-end loop before expanding.

The first working system must support:

```text
upload/index files
  -> extract content
  -> search them
  -> generate source-backed knowledge pages
  -> inspect source references
  -> optionally generate plan
  -> simulate plan
  -> approve plan
  -> execute safely
  -> restore if needed
  -> monitor health
```

## Sprint 1 — Repository, auth, storage, and upload foundation

Goals:

```text
monorepo foundation
auth shell
tenant/workspace model
object storage
file upload
file registry
basic audit events
```

Deliverables:

```text
apps/web shell
apps/api shell
PostgreSQL schema baseline
MinIO storage integration
admin/user role baseline
file upload API
file registry package
```

Acceptance criteria:

- User can log in.
- Admin can create workspace.
- User can upload file.
- File is stored and registered.
- Audit event is created.

## Sprint 2 — Ingestion, extraction, and CIIF baseline

Goals:

```text
file type detection
PDF/DOCX/TXT/CSV/XLSX extraction
PNG/JPG OCR baseline
normalized document contract
chunk creation
```

Deliverables:

```text
ingestion service
extraction service
CIIF package
worker skeleton
extraction status UI
```

Acceptance criteria:

- Uploaded/indexed files are extracted.
- Extracted content is stored.
- Failed extractions create visible status.
- Source file references are preserved.

## Sprint 3 — Search & Explore wiki knowledge base

Goals:

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

Deliverables:

```text
retrieval service
Search & Explore page
Knowledge Area page
Document Context panel
Source-backed Wiki view
Reading Mode
Wiki search
```

Acceptance criteria:

- User can search indexed files.
- Results show filename, source location, summary, and trust indicators.
- User can open document context.
- User can build and browse source-backed Wiki pages.
- Wiki pages prioritize the actual extracted document content over system metadata.
- User can navigate category -> topic -> source file pages.
- User can search inside the generated knowledge base.

Current local status:

```text
implemented in local MVP user UI, still needs deeper citation rendering, persistent wiki storage, better AI topic generation, and richer media/table extraction
```

## Sprint 4 — Planning Center and simulation

Goals:

```text
organization plans
duplicate cleanup plans
canonical document suggestions
simulation results
blast-radius panel
before/after preview
```

Deliverables:

```text
planning contracts
planning service
simulation service
Planning Center UI
Plan Detail page
```

Acceptance criteria:

- AI/system can generate a plan.
- Plan actions explain why they exist.
- Simulation shows affected files, risk, confidence, and rollback readiness.

## Sprint 5 — Governed execution and recovery

Goals:

```text
approval workflow
execution lock
recovery snapshot
bounded internal file actions
trashbin
restore
rollback simulation
```

Deliverables:

```text
execution service
recovery service
trashbin service
Recovery Center page
Execution Detail page
```

Acceptance criteria:

- Approved plan can execute safely.
- Execution creates recovery snapshot.
- File can move to trash.
- File can be restored.
- Audit and replay events are created.

## Sprint 6 — Operations Center and ticket intelligence

Goals:

```text
manual tickets
AI-generated tickets
extraction failure tickets
runtime health signals
health signal panels
improvement proposals
```

Deliverables:

```text
ticket service
operations service
Operations Center page
Ticket Detail page
AI assessment contract
```

Acceptance criteria:

- User can create ticket.
- System can create ticket from extraction failure.
- Operations Center shows active issues and health signals.

## Sprint 7 — Stats & Insights and admin console

Goals:

```text
core KPIs
health scores
insight recommendations
role/page/capability control
AI permissions
retention/source mode settings
```

Deliverables:

```text
insights service
Stats & Insights page
Admin Console
Role Access Matrix
AI Authority Settings
Retention Settings
```

Acceptance criteria:

- Admin controls page access.
- Admin controls capabilities.
- Stats page shows indexed files, extraction success, failed searches, tickets, recovery readiness.

## Sprint 8 — UX polish, launch hardening, and documentation

Goals:

```text
Apple-style UI refinement
empty states
trust indicators
onboarding polish
security validation
release checklist
smoke tests
```

Deliverables:

```text
final onboarding flow
launch gate checklist
smoke test scripts
updated README
deployment guide
```

Acceptance criteria:

- MVP launch gate passes.
- Product feels calm, structured, and safe.
- Docs match shipped functionality.

## Engineering rules

Every sprint must preserve:

```text
tenant isolation when production mode exists
backend permission enforcement
audit events
recovery path for destructive actions
source references
clear UX feedback
safe user/admin separation
no destructive workflows in the ordinary user UI
```

## Immediate next implementation priorities

```text
1. Finish frontend rendering for chunk citations like [S1:C3]
2. Make citations clickable and linked to source locations / source preview
3. Persist wiki pages and source chunks in SQLite
4. Improve AI category/topic generation beyond rule-based grouping
5. Improve extracted document formatting for book/blog-like reading
6. Add page-level search and table of contents in Reading Mode
7. Split UserApp.tsx into smaller maintainable components
8. Add progress stages for Build Knowledge / Build Wiki
```

## Strategic outcome

This roadmap converts EverythingAI from architecture into a buildable enterprise product:

```text
Governed Enterprise Cognitive Workspace
```

The local MVP currently acts as the proving ground for the most important product principle:

```text
A safe, source-backed AI file brain that turns local files into searchable, readable, trusted knowledge.
```
