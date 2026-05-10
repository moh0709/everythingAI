# Enterprise API Contracts

## Purpose

This document defines the MVP API surface for the EverythingAI Workspace platform.

The API must support the complete MVP loop:

```text
onboard workspace
  -> ingest files
  -> extract/index content
  -> search and explore
  -> generate and simulate plans
  -> approve and execute safely
  -> recover/restore
  -> monitor operations and insights
  -> administer users, roles, and AI authority
```

All endpoints must enforce authentication, tenant isolation, workspace access, and capability permissions server-side.

---

# 1. API Principles

## 1.1 Backend enforcement is mandatory

Frontend page hiding is UX only. Backend endpoints must enforce:

```text
authentication
tenant boundary
workspace boundary
knowledge area access
capability permission
AI authority boundary
source mode policy
retention policy
execution risk policy
```

## 1.2 Standard response envelope

Recommended success response:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req-id",
    "correlation_id": "correlation-id"
  }
}
```

Recommended error response:

```json
{
  "success": false,
  "error": {
    "code": "permission_denied",
    "message": "User does not have permission to execute this action.",
    "details": {}
  },
  "meta": {
    "request_id": "req-id",
    "correlation_id": "correlation-id"
  }
}
```

## 1.3 Required audit behavior

Create audit events for:

```text
file upload
file extraction
search query
plan creation
plan approval
execution start/completion
trash move
restore
permission change
AI-generated ticket
retention policy change
source mode change
```

---

# 2. Auth & Session API

## GET /auth/me

Returns current authenticated user, tenant, roles, permissions, and accessible workspaces.

Required permission:

```text
authenticated
```

Response:

```json
{
  "user": {},
  "tenant": {},
  "roles": [],
  "permissions": [],
  "workspaces": []
}
```

## POST /auth/logout

Ends the current session where applicable.

---

# 3. Onboarding API

## POST /onboarding/tenant

Creates tenant during first setup.

Request:

```json
{
  "name": "Acme Engineering",
  "slug": "acme-engineering"
}
```

## POST /onboarding/workspace

Creates workspace.

Request:

```json
{
  "tenant_id": "tenant-id",
  "name": "Engineering Knowledge",
  "description": "Engineering manuals and procedures",
  "default_source_mode": "copy"
}
```

## POST /onboarding/source-mode

Sets default source mode for a workspace.

Request:

```json
{
  "workspace_id": "workspace-id",
  "default_source_mode": "reference | copy"
}
```

Managed mode should not be enabled by default in MVP.

## POST /onboarding/scan-preview

Scans uploaded/selected files before full indexing.

Response:

```json
{
  "files_found": 1284,
  "supported_files": 1102,
  "unsupported_files": 182,
  "potential_duplicates": 74,
  "detected_knowledge_areas": ["Engineering", "Maintenance", "Suppliers"],
  "source_mode": "copy",
  "recovery_enabled": true
}
```

## POST /onboarding/start-indexing

Starts indexing after safety review.

## GET /onboarding/status

Returns onboarding and indexing progress.

---

# 4. Admin API

## GET /admin/users

Lists tenant users.

Required permission:

```text
manage.users
```

## POST /admin/users/invite

Invites a user.

Request:

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "role_ids": [],
  "workspace_ids": []
}
```

## PATCH /admin/users/:id

Updates user status, roles, and workspace access.

## GET /admin/roles

Lists roles.

## POST /admin/roles

Creates custom role.

## PATCH /admin/roles/:id

Updates role metadata.

## GET /admin/permissions

Lists available permission keys.

## PATCH /admin/roles/:id/permissions

Updates role permissions.

Request:

```json
{
  "permissions": [
    { "key": "search.knowledge", "granted": true },
    { "key": "execute.plan", "granted": false }
  ]
}
```

## GET /admin/page-access

Returns page access matrix.

## PATCH /admin/page-access

Updates page access matrix.

## GET /admin/ai-permissions

Returns AI authority settings.

## PATCH /admin/ai-permissions

Updates AI permissions.

Important MVP rule:

```text
AI may not permanently purge files.
AI may not change policies.
AI may not change user access.
```

## GET /admin/source-modes

Returns workspace source mode settings.

## PATCH /admin/source-modes

Updates source mode settings.

## GET /admin/retention

Returns retention policy.

## PATCH /admin/retention

Updates retention policy.

Default:

```json
{
  "trash_retention_days": 30,
  "auto_purge_enabled": true,
  "require_approval_for_purge": true,
  "preserve_audit_after_purge": true,
  "preserve_replay_after_purge": true,
  "minimum_retention_days": 7
}
```

## GET /admin/audit-logs

Returns audit events with filtering.

---

# 5. File & Ingestion API

## POST /files/upload

Uploads one or more files into a workspace.

Required permission:

```text
upload.files
```

Multipart fields:

```text
workspace_id
source_mode
files[]
```

Response:

```json
{
  "uploaded": [
    {
      "file_id": "file-id",
      "filename": "LT1_Blower_Manual.pdf",
      "source_mode": "copy",
      "status": "registered"
    }
  ]
}
```

## GET /files

Lists files with filters.

Query:

```text
workspace_id
q
status
source_mode
knowledge_area_id
limit
offset
```

## GET /files/:fileId

Returns file registry entry and current status.

## POST /files/:fileId/extract

Queues extraction for one file.

## POST /ingestion/extract

Queues batch extraction.

Request:

```json
{
  "workspace_id": "workspace-id",
  "file_ids": [],
  "limit": 100
}
```

## GET /ingestion/status

Returns ingestion and extraction status.

---

# 6. Search & Knowledge API

## GET /search

Searches indexed knowledge.

Required permission:

```text
search.knowledge
```

Query:

```text
workspace_id
q
search_type=keyword|semantic|hybrid|filename
knowledge_area_id
limit
offset
```

Response must return SearchResultContract items with source references.

## GET /search/suggest

Returns search suggestions.

## GET /knowledge-areas

Lists accessible knowledge areas.

## POST /knowledge-areas

Creates knowledge area.

Required permission:

```text
create.collections
```

## GET /knowledge-areas/:id

Returns knowledge area overview.

## GET /semantic-collections

Lists semantic collections.

## POST /semantic-collections

Creates semantic collection.

## GET /documents/:id/context

Returns document context panel data.

## GET /documents/:id/relationships

Returns related documents.

## GET /documents/:id/lineage

Returns document lineage.

## GET /documents/:id/references

Returns references and source details.

## POST /documents/:id/mark-canonical

Marks document/file as canonical.

Required permission:

```text
mark_canonical
```

## POST /documents/:id/report-issue

Creates support/quality ticket linked to document.

---

# 7. Planning API

## GET /planning

Lists plans.

## POST /planning/analyze-workspace

Analyzes workspace for improvement opportunities.

Required permission:

```text
suggest.organization
```

## POST /planning/generate-plan

Generates a plan.

Request:

```json
{
  "workspace_id": "workspace-id",
  "plan_type": "organization | duplicate_cleanup | canonicalization",
  "scope": {}
}
```

## GET /planning/:id

Returns plan detail.

## GET /planning/:id/actions

Returns plan actions.

## POST /planning/:id/simulate

Runs simulation.

Required permission:

```text
simulate.plan
```

## GET /planning/:id/simulation

Returns simulation result.

## POST /planning/:id/approve

Approves a plan.

Required permission:

```text
approve.plan
```

## POST /planning/:id/reject

Rejects a plan.

## POST /planning/:id/execute

Queues approved plan for execution.

Required permission:

```text
execute.plan
```

## GET /planning/:id/replay

Returns planning replay/audit timeline.

---

# 8. Execution API

## POST /execution/:planId/queue

Queues approved plan execution.

## POST /execution/:executionId/start

Starts execution worker flow.

Usually system/internal only.

## GET /execution

Lists executions.

## GET /execution/:executionId

Returns execution detail.

## GET /execution/:executionId/actions

Returns execution action results.

## GET /execution/:executionId/replay

Returns execution replay timeline.

## POST /execution/:executionId/rollback/simulate

Simulates rollback.

Required permission:

```text
simulate.rollback
```

## POST /execution/:executionId/rollback/request

Requests rollback.

## POST /execution/:executionId/rollback/approve

Approves rollback.

## POST /execution/:executionId/rollback/execute

Executes rollback.

Required permission:

```text
execute.rollback
```

---

# 9. Recovery API

## GET /recovery/trash

Lists trashbin records.

Required permission:

```text
view.trash
```

## GET /recovery/trash/:id

Returns trash item detail.

## POST /recovery/trash/:id/restore/simulate

Simulates restore.

## POST /recovery/trash/:id/restore

Restores file.

Required permission:

```text
restore.files
```

## POST /recovery/trash/:id/purge/request

Requests permanent purge.

Required permission:

```text
approve.purge
```

## POST /recovery/trash/:id/purge/approve

Approves purge.

## GET /recovery/snapshots

Lists recovery snapshots.

## GET /recovery/snapshots/:id

Returns snapshot detail.

## GET /recovery/policies

Returns retention policy.

## PUT /recovery/policies/:id

Updates retention policy.

Required permission:

```text
manage.retention
```

---

# 10. Tickets & Operations API

## GET /tickets

Lists tickets.

## POST /tickets

Creates user support ticket.

## GET /tickets/:id

Returns ticket detail.

## PATCH /tickets/:id

Updates ticket status, severity, assignment, or description.

## POST /tickets/:id/comment

Adds comment.

## POST /tickets/:id/resolve

Resolves ticket.

## POST /tickets/:id/reject

Rejects ticket.

## POST /tickets/:id/convert-to-plan

Converts improvement ticket to Planning Center plan.

## GET /operations/health

Returns operational health summary.

## GET /operations/signals

Returns raw health signals.

## GET /operations/alerts

Returns alerts.

## POST /operations/scan

Runs operational scan that may create AI/system tickets.

---

# 11. Insights API

## GET /insights/summary

Returns executive summary.

## GET /insights/kpis

Returns KPI metrics.

## GET /insights/kpis/:category

Returns KPIs for a category.

Categories:

```text
knowledge_health
retrieval
governance
recovery
operations
ai_impact
```

## GET /insights/trends

Returns trend data.

## GET /insights/recommendations

Returns AI/system recommendations.

## POST /insights/:id/create-ticket

Creates ticket from insight.

## GET /insights/health-score

Returns health scores.

## GET /insights/export

Exports report.

Required permission:

```text
view.insights
```

---

# 12. Audit API

## GET /audit/events

Returns audit events.

Query:

```text
workspace_id
actor_type
event_type
target_type
target_id
from
to
limit
offset
```

## GET /audit/replay/:referenceId

Returns replay data for a reference.

---

# 13. MVP Endpoint Priority

Implement endpoints in this order:

```text
/auth/me
/admin roles + permissions baseline
/files/upload
/files
/files/:fileId
/ingestion/extract
/ingestion/status
/search
/documents/:id/context
/recovery/trash
/recovery/trash/:id/restore
/planning/generate-plan
/planning/:id/simulate
/planning/:id/approve
/planning/:id/execute
/execution/:executionId
/tickets
/operations/health
/insights/kpis
```

---

# 14. Launch Blockers

Do not launch without these API behaviors:

```text
all protected APIs require authentication
all data APIs enforce tenant_id
search results include source references
execution APIs require approval
recovery APIs respect retention
admin APIs create audit events
AI/system-created tickets include evidence
permission-denied responses are explicit
```
