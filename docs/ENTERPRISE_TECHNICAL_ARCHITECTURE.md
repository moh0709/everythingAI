# Enterprise Technical Architecture

## Target architecture

EverythingAI should evolve from the local MVP into a production-grade governed enterprise cognitive workspace.

Recommended production structure:

```text
apps/
  web/
  api/
  gateway/
  admin/

packages/
  ui/
  design-system/
  auth/
  contracts/
  events/
  ciif/
  files/
  planning/
  execution/
  recovery/
  insights/
  tickets/
  shared/

services/
  ingestion/
  extraction/
  embeddings/
  retrieval/
  knowledge/
  topology/
  planning/
  execution/
  governance/
  recovery/
  operations/
  insights/
  admin/
  onboarding/
  security/

infrastructure/
  docker/
  compose/
  postgres/
  qdrant/
  minio/
  nats/
  temporal/
  observability/
```

## Initial deployment stack

Recommended first production-oriented deployment:

| Layer | Recommendation |
|---|---|
| Frontend | Next.js |
| Backend API | NestJS |
| Workers | Node.js workers |
| Relational DB | PostgreSQL |
| Vector DB | Qdrant |
| Object storage | MinIO / S3-compatible |
| Queue/eventing | NATS initially |
| Workflow orchestration | Temporal later or when complexity justifies it |
| Auth | Keycloak or equivalent enterprise identity provider |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki |

## Core services

### Ingestion service

Responsible for acquiring files, registering metadata, validating source mode, fingerprinting, and dispatching extraction jobs.

### Extraction service

Responsible for extracting text and metadata from supported file types.

MVP file support:

```text
PDF
DOCX
TXT
CSV
XLSX
PNG/JPG OCR
```

### Retrieval service

Responsible for keyword search, semantic search, hybrid search, source references, governance filtering, and result assembly.

### Knowledge service

Responsible for Knowledge Areas, Semantic Collections, document context, canonical documents, and structured wiki layout.

### Topology service

Responsible for document relationships, semantic clusters, lineage, duplicate groups, and canonical version relationships.

### Planning service

Responsible for organization plans, duplicate cleanup plans, canonical document plans, simulations, blast-radius analysis, and before/after structures.

### Execution service

Responsible for executing approved low-risk internal ecosystem actions with locks, snapshots, audit events, and replay metadata.

### Recovery service

Responsible for trashbin, restore, snapshots, rollback simulation, retention policies, and purge governance.

### Operations service

Responsible for tickets, AI assessments, runtime health signals, anomaly detection, improvement proposals, and operational issue tracking.

### Insights service

Responsible for KPIs, health scores, trends, executive summaries, and insight-to-ticket workflows.

### Admin service

Responsible for users, roles, page access, capability access, AI authority settings, retention settings, source mode settings, and audit logs.

## Canonical data domains

```text
Tenant
Workspace
User
Role
Permission
File
Document
Chunk
Embedding
KnowledgeArea
SemanticCollection
Relationship
Plan
PlanAction
Simulation
Execution
ExecutionAction
RecoverySnapshot
TrashRecord
Restore
Rollback
Ticket
Insight
Metric
AuditEvent
```

## Event envelope

All important system events should use a consistent replayable event envelope:

```json
{
  "event_id": "tenant-event-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "event_type": "file.ingested",
  "source_service": "ingestion",
  "timestamp": "timestamp",
  "correlation_id": "correlation-id",
  "actor_type": "user | ai-agent | system",
  "actor_id": "actor-id",
  "payload": {},
  "replayable": true,
  "schema_version": "v1"
}
```

## Security laws

1. Backend permission enforcement is mandatory.
2. Tenant isolation is mandatory.
3. AI permissions must be explicitly scoped.
4. Execution requires approval, policy validation, audit, replay, and recovery snapshot.
5. Trashbin retention defaults to 30 days.
6. AI may not permanently purge files in MVP.
7. Search results must be governance-filtered.

## Runtime priorities

Track at minimum:

```text
upload count
extraction success/failure
queue depth
search latency
failed searches
open tickets
trashbin count
recovery snapshot coverage
replay coverage
permission failures
```

## MVP technical launch gate

The MVP is technically launch-ready when:

- Auth and tenant isolation work.
- Admin can control roles, pages, and capabilities.
- Upload and ingestion work.
- Extraction and indexing work for MVP file types.
- Search returns filename references and source context.
- Planning simulation works.
- Approved execution creates snapshots and audit events.
- Trashbin and restore work.
- Operations Center shows tickets and health.
- Stats & Insights shows core KPIs.
