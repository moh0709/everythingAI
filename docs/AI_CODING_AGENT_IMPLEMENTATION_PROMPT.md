# AI Coding Agent Implementation Prompt

## Purpose

Use this prompt for an AI coding agent such as Cline, Copilot, Kilo Code, or similar tools when implementing the EverythingAI Workspace MVP.

The agent must follow the documentation in `/docs` and build in disciplined MVP order.

## Product target

Build **EverythingAI Workspace MVP**: a governed enterprise cognitive workspace where users can onboard a workspace, ingest files, extract content, search and explore knowledge, generate safe organization plans, simulate plans, approve execution, recover files, monitor operations, and view KPIs.

The MVP must prioritize:

```text
safety
source references
recoverability
governance
admin control
clear UX
end-to-end working flow
```

Do not build speculative future layers before the MVP loop works.

## Required reading before coding

Read these files first:

```text
docs/ENTERPRISE_WORKSPACE_PRD.md
docs/ENTERPRISE_TECHNICAL_ARCHITECTURE.md
docs/ENTERPRISE_ACCESS_CONTROL.md
docs/INTERNAL_FILE_ECOSYSTEM.md
docs/SEARCH_EXPLORE_WIKI.md
docs/PLANNING_EXECUTION_RECOVERY.md
docs/OPERATIONS_INSIGHTS_TICKETS.md
docs/ENTERPRISE_UX_SPEC.md
docs/MVP_LAUNCH_GATE.md
docs/IMPLEMENTATION_ROADMAP.md
```

Also inspect the existing local MVP implementation in:

```text
services/api
```

Reuse working ideas from the local MVP where practical, but do not break existing behavior.

## Non-negotiable rules

1. Do not remove existing working local MVP functionality unless explicitly instructed.
2. Do not implement permanent delete as a normal user or AI action.
3. All delete-like actions must move files to trashbin first.
4. Trashbin retention defaults to 30 days.
5. Backend permission enforcement is mandatory.
6. Frontend hiding is not security.
7. Every search result must reference source file information.
8. Every execution must have approval, audit event, replay reference, and recovery snapshot.
9. AI may propose, simulate, classify, and create tickets; AI may not bypass governance.
10. Build the MVP in the sprint order below.

## Sprint order

### Sprint 1 — Foundation

Implement or prepare:

```text
monorepo / app structure if not already present
auth baseline
tenant/workspace model
file registry
object storage abstraction
upload API
basic audit events
admin access model foundation
```

Acceptance criteria:

```text
user can log in or use a protected local/dev token
admin can create or identify a workspace
user can upload file
file is registered with source mode
file metadata is persisted
audit event is created
```

### Sprint 2 — Ingestion and extraction

Implement:

```text
file type detection
PDF extraction
DOCX extraction
TXT extraction
CSV extraction
XLSX extraction
PNG/JPG OCR baseline
CIIF normalization
chunk creation
extraction status
```

Acceptance criteria:

```text
uploaded file gets extracted
extracted content is stored
failed extraction is visible
source file reference is preserved
```

### Sprint 3 — Search & Explore

Implement:

```text
keyword search
semantic/vector search or existing deterministic semantic retrieval fallback
Search & Explore page
SearchResultCard
ReferencePanel
DocumentContextPanel
KnowledgeAreaPage baseline
```

Acceptance criteria:

```text
user can search indexed files
results show filename, path/source, summary, source mode, confidence/trust status
user can open document context
backend filters results by tenant/permissions
```

### Sprint 4 — Planning Center

Implement:

```text
organization plan contract
plan action contract
simulation contract
duplicate cleanup plan baseline
canonical document suggestion baseline
PlanningCenterPage
PlanDetailPage
BeforeAfterPreview
BlastRadiusPanel
SimulationPanel
```

Acceptance criteria:

```text
system can generate a plan
plan actions explain why they exist
plan can be simulated before execution
simulation shows affected files, risk, confidence, rollback readiness
```

### Sprint 5 — Governed execution and recovery

Implement:

```text
execution contract
execution action contract
execution policy validator
execution lock service
recovery snapshot service
trashbin service
restore service
rollback simulation baseline
RecoveryCenterPage
ExecutionDetailPage
```

Acceptance criteria:

```text
approved plan can execute bounded internal ecosystem actions
execution creates recovery snapshot
file can move to trash
file can be restored
execution/recovery audit events are created
```

### Sprint 6 — Operations and tickets

Implement:

```text
ticket contract
ticket lifecycle
AI assessment contract
manual ticket creation
AI/system ticket creation from extraction failure
OperationsCenterPage
TicketCard
TicketDetailPage
HealthSignalPanel
```

Acceptance criteria:

```text
user can create ticket
system can create ticket from operational failure
Operations Center shows active tickets and health signals
```

### Sprint 7 — Stats, insights, and admin console

Implement:

```text
KPI contracts
health score contract
core metrics aggregation
StatsInsightsPage
KpiCard
HealthScorePanel
AdminConsolePage
RoleAccessMatrix
AIAuthoritySettings
RetentionSettings
SourceModeSettings
```

Acceptance criteria:

```text
admin can control page access and capabilities
admin can control AI authority settings
Stats page shows indexed files, extraction success, failed searches, tickets, recovery readiness
```

### Sprint 8 — UX polish and launch hardening

Implement:

```text
Apple-style visual refinement
empty states
trust indicators
onboarding polish
smoke tests
README/docs verification
launch gate checklist
```

Acceptance criteria:

```text
MVP launch gate passes
the product feels calm, structured, safe, and understandable
docs match shipped functionality
```

## Core data contracts to create or align

```text
User
Role
Permission
Tenant
Workspace
FileRegistryEntry
Document
Chunk
EmbeddingReference
KnowledgeArea
SemanticCollection
Plan
PlanAction
SimulationResult
Execution
ExecutionAction
RecoverySnapshot
TrashRecord
RestoreRequest
RollbackRequest
Ticket
AIAssessment
KpiMetric
Insight
AuditEvent
```

## Core API areas

Implement gradually:

```text
/auth
/admin
/files
/ingestion
/search
/knowledge-areas
/documents
/planning
/execution
/recovery
/tickets
/operations
/insights
/audit
```

## Required UX behavior

The UI must show trust and source context.

Search results must show:

```text
filename
knowledge area
original source reference
internal ecosystem location when available
source mode
AI summary
related documents
confidence score
governance status
recovery status
last updated
```

Planning must show:

```text
proposed actions
before/after preview
affected files
blast radius
risk level
rollback availability
approval requirement
```

Recovery must show:

```text
what was removed
why it was removed
who/what removed it
retention countdown
restore availability
execution reference
```

## Security requirements

Implement server-side checks for:

```text
authentication
tenant isolation
workspace access
knowledge area access
capability permission
AI authority boundary
source mode policy
retention policy
execution risk policy
```

## Safety requirements

File handling must protect against:

```text
path traversal
unsafe extension trust
oversized uploads
unsupported file types
archive/decompression risk
cross-tenant access
unapproved execution
unrecoverable destructive action
```

## Testing expectations

For each implemented area, add or update tests for:

```text
permission enforcement
file registry behavior
source mode handling
extraction success/failure
search result source references
planning simulation
execution snapshot creation
trashbin restore
admin access control
```

## Output style for each coding step

When reporting progress, include:

```text
files changed
what was added
what was not added
how to test
known limitations
next recommended step
```

## Highest priority implementation target

Start with the smallest end-to-end path:

```text
upload one PDF
extract text
index content
search it
show filename/source reference
move to trash
restore it
```

Only after this works should the agent expand to planning, execution, operations, and insights.
