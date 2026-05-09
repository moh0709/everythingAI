# Planning, Governed Execution, and Recovery

## Purpose

This document defines how EverythingAI turns searchable enterprise knowledge into safe, approved, reversible actions.

The three connected product areas are:

```text
Planning Center
  -> Governed Execution
  -> Recovery Center
```

## Core principle

AI may propose structure, but governance controls execution.

Execution must never happen without:

```text
approved plan
permission validation
policy validation
recovery snapshot
bounded scope
audit trail
replay record
rollback path
```

## Planning Center

The Planning Center allows AI to suggest improvements such as:

- Reorganizing files
- Creating semantic collections
- Marking canonical documents
- Archiving duplicates
- Moving files into better knowledge areas
- Creating tickets for knowledge issues

## Planning types

MVP planning types:

| Plan type | Purpose |
|---|---|
| Organization Plan | Move/categorize files into better structure |
| Duplicate Cleanup Plan | Detect and handle duplicates |
| Canonical Document Plan | Identify current/main document versions |

Later:

- Knowledge Area Plan
- Semantic Collection Plan
- Recovery Plan
- Ticket Plan

## Planning flow

```text
analyze workspace
  -> detect improvement opportunities
  -> generate proposed changes
  -> simulate impact
  -> estimate blast radius
  -> verify rollback availability
  -> show plan to user
  -> request approval
  -> execute bounded actions
  -> create replay/audit trail
```

## Plan object

```json
{
  "plan_id": "tenant-plan-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "plan_type": "organization | duplicate_cleanup | canonicalization",
  "title": "Consolidate LT1 blower documentation",
  "description": "AI proposes consolidating duplicate blower manuals and linking related maintenance documents.",
  "status": "draft | simulated | pending_approval | approved | executed | rejected",
  "risk_level": "low | medium | high",
  "confidence_score": 0.91,
  "blast_radius": {
    "files_affected": 42,
    "knowledge_areas_affected": 2,
    "collections_affected": 3
  },
  "rollback_available": true,
  "requires_approval": true,
  "created_by": "ai-agent-id",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Plan action object

```json
{
  "action_id": "tenant-action-uuid",
  "plan_id": "tenant-plan-uuid",
  "action_type": "move | copy | archive | tag | mark_canonical | create_collection | create_ticket",
  "target_file_id": "file-id",
  "current_state": {},
  "proposed_state": {},
  "reason": "File is semantically related to LT1 blower maintenance documents.",
  "confidence_score": 0.94,
  "risk_level": "low",
  "rollback_available": true
}
```

Every proposed action must explain why it exists.

## Simulation result

```json
{
  "simulation_id": "tenant-simulation-uuid",
  "plan_id": "plan-id",
  "status": "completed | failed",
  "files_affected": 42,
  "estimated_duration_seconds": 12,
  "rollback_available": true,
  "recovery_snapshot_required": true,
  "warnings": [],
  "governance_requirements": ["operator_approval_required"],
  "simulated_at": "timestamp"
}
```

## Governed execution

MVP execution should only support low-risk internal ecosystem operations.

| Operation | MVP support |
|---|---:|
| move internal file | yes |
| copy internal file | yes |
| tag file | yes |
| assign knowledge area | yes |
| create semantic collection | yes |
| mark canonical document | yes |
| archive duplicate | yes |
| move to trash | yes |
| permanent purge | no |
| move original external file | no |

## Execution flow

```text
approved plan
  -> permission validation
  -> policy validation
  -> recovery snapshot creation
  -> execution lock
  -> bounded action execution
  -> audit event creation
  -> replay record creation
  -> search/index update
  -> topology update
  -> execution summary
```

## Execution object

```json
{
  "execution_id": "tenant-execution-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "plan_id": "plan-id",
  "status": "queued | running | completed | failed | rolled_back",
  "approved_by": "user-id",
  "executed_by": "system | ai-agent | user",
  "recovery_snapshot_id": "snapshot-id",
  "actions_total": 42,
  "actions_completed": 42,
  "actions_failed": 0,
  "rollback_available": true,
  "started_at": "timestamp",
  "completed_at": "timestamp"
}
```

## Recovery snapshot

Before execution, the system must snapshot:

```text
file registry state
source mode state
internal file locations
metadata state
knowledge area assignments
semantic collection assignments
canonical document flags
topology relationships
search index references
governance approval state
```

This is a cognitive state checkpoint, not only a file backup.

## Recovery Center

The Recovery Center should include:

```text
Trashbin
Recovery Snapshots
Rollback Requests
Recently Restored
Purge Eligible
Retention Settings
Recovery Audit
```

MVP starts with:

```text
Trashbin
Recovery Snapshots
Restore Actions
Retention Countdown
```

## Trashbin retention

Default:

```text
trash_retention_days = 30
```

Permanent purge is disabled for normal users. AI may never permanently purge files in MVP. Audit, replay, and lineage metadata remain after purge.

## Restore flow

```text
restore requested
  -> permission validation
  -> retention validation
  -> snapshot/trash integrity validation
  -> restore simulation
  -> approval if required
  -> restore file + metadata
  -> restore search index
  -> restore topology links
  -> create audit event
  -> show restore summary
```

## Rollback flow

```text
rollback requested
  -> permission validation
  -> snapshot integrity validation
  -> rollback simulation
  -> approval if required
  -> restore previous state
  -> reindex affected knowledge
  -> restore topology
  -> audit rollback
```

Rollback is itself an execution and must be replayable.

## Planning API endpoints

```text
POST /planning/analyze-workspace
POST /planning/generate-plan
POST /planning/:id/simulate
POST /planning/:id/approve
POST /planning/:id/reject
POST /planning/:id/execute
GET  /planning
GET  /planning/:id
GET  /planning/:id/actions
GET  /planning/:id/simulation
GET  /planning/:id/replay
```

## Execution API endpoints

```text
POST /execution/:planId/queue
POST /execution/:executionId/start
GET  /execution
GET  /execution/:executionId
GET  /execution/:executionId/actions
GET  /execution/:executionId/replay
POST /execution/:executionId/rollback/simulate
POST /execution/:executionId/rollback/request
POST /execution/:executionId/rollback/approve
POST /execution/:executionId/rollback/execute
```

## Recovery API endpoints

```text
GET  /recovery/trash
GET  /recovery/trash/:id
POST /recovery/trash/:id/restore/simulate
POST /recovery/trash/:id/restore
POST /recovery/trash/:id/purge/request
POST /recovery/trash/:id/purge/approve
GET  /recovery/snapshots
GET  /recovery/snapshots/:id
POST /recovery/executions/:id/rollback/simulate
POST /recovery/executions/:id/rollback
GET  /recovery/policies
PUT  /recovery/policies/:id
```

## Implementation targets

```text
packages/planning/planContract.ts
packages/planning/planActionContract.ts
packages/planning/simulationContract.ts
packages/execution/executionContract.ts
packages/execution/executionActionContract.ts
packages/recovery/trashContract.ts
packages/recovery/restoreContract.ts
packages/recovery/recoverySnapshotContract.ts

services/planning/src/organizationPlanningService.ts
services/planning/src/duplicateCleanupPlanningService.ts
services/planning/src/canonicalDocumentPlanningService.ts
services/execution/src/executionOrchestrator.ts
services/execution/src/executionLockService.ts
services/recovery/src/trashbinService.ts
services/recovery/src/restoreService.ts
services/recovery/src/recoverySnapshotService.ts
services/recovery/src/rollbackService.ts

apps/web/src/planning/PlanningCenterPage.tsx
apps/web/src/execution/ExecutionDetailPage.tsx
apps/web/src/recovery/RecoveryCenterPage.tsx
```
