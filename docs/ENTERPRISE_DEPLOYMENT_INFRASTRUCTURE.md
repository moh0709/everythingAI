# Enterprise Deployment & Infrastructure Specification

## Purpose

This document defines the deployment and infrastructure strategy for the EverythingAI Workspace MVP and its later production evolution.

The MVP should start simple, observable, and safe. The first target is a Docker Compose based single-node deployment that can later evolve into a distributed production platform.

---

# 1. Deployment Principles

## 1.1 Start simple

The MVP should use:

```text
Docker Compose
single-node deployment
clear environment variables
simple service boundaries
basic observability
```

Do not introduce Kubernetes before the MVP core loop is stable.

## 1.2 Infrastructure must support trust

Infrastructure must support:

```text
authentication
tenant isolation
object storage
file extraction workers
vector search
queue processing
audit logging
trashbin/recovery
runtime health
```

## 1.3 Production architecture can evolve later

The MVP should be designed so it can later move to:

```text
Kubernetes
managed PostgreSQL
managed object storage
managed vector database
external identity provider
full observability stack
```

---

# 2. MVP Infrastructure Services

Required services:

| Service | Purpose | MVP requirement |
|---|---|---|
| Web app | User interface | Required |
| API service | Backend API | Required |
| Worker service | Ingestion/extraction/background jobs | Required |
| PostgreSQL | Relational database | Required for enterprise MVP |
| Qdrant | Vector database | Required for semantic retrieval |
| MinIO | S3-compatible object storage | Required for internal file ecosystem |
| NATS or Redis | Queue/event transport | Required |
| Auth provider | Authentication/RBAC | Required |
| Observability baseline | Logs/health/metrics | Required |

Optional after MVP:

| Service | Purpose |
|---|---|
| Neo4j | Relationship graph/topology |
| Temporal | Durable workflow orchestration |
| Prometheus/Grafana/Loki | Full observability stack |
| ClamAV | Antivirus scanning |
| Keycloak | Enterprise SSO/RBAC provider if not used initially |

---

# 3. Recommended Docker Compose Topology

```text
web
api
worker-ingestion
worker-extraction
worker-embeddings
postgres
qdrant
minio
nats
observability-lite
```

Later:

```text
neo4j
temporal
prometheus
grafana
loki
clamav
keycloak
```

---

# 4. Environment Variables

## Application

```text
NODE_ENV=development
APP_ENV=local
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4100
```

## Database

```text
DATABASE_URL=postgresql://everythingai:everythingai@postgres:5432/everythingai
```

## Object Storage

```text
S3_ENDPOINT=http://minio:9000
S3_REGION=local
S3_BUCKET=everythingai
S3_ACCESS_KEY=everythingai
S3_SECRET_KEY=change-me
S3_FORCE_PATH_STYLE=true
```

## Vector Database

```text
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=everythingai_chunks
```

## Queue

```text
NATS_URL=nats://nats:4222
```

or, if Redis is used first:

```text
REDIS_URL=redis://redis:6379/0
```

## Auth

```text
AUTH_MODE=local-dev | oidc | keycloak
JWT_SECRET=change-me
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
```

## File Processing

```text
MAX_UPLOAD_SIZE_BYTES=262144000
TRASH_RETENTION_DAYS=30
ENABLE_MANAGED_MODE=false
ENABLE_ARCHIVE_EXTRACTION=false
ENABLE_AI_EXECUTION=false
```

## AI / Embeddings

```text
EMBEDDING_PROVIDER=local | openai | ollama | qdrant-test
EMBEDDING_MODEL=bge-large
LLM_PROVIDER=none | ollama | openai | compatible
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=
```

---

# 5. Storage Layout

MinIO bucket layout should follow the internal file ecosystem:

```text
tenants/{tenant_id}/workspaces/{workspace_id}/raw/files/
tenants/{tenant_id}/workspaces/{workspace_id}/raw/imports/
tenants/{tenant_id}/workspaces/{workspace_id}/extracted/text/
tenants/{tenant_id}/workspaces/{workspace_id}/extracted/metadata/
tenants/{tenant_id}/workspaces/{workspace_id}/normalized/ciif/
tenants/{tenant_id}/workspaces/{workspace_id}/embeddings/manifests/
tenants/{tenant_id}/workspaces/{workspace_id}/snapshots/recovery/
tenants/{tenant_id}/workspaces/{workspace_id}/snapshots/execution/
tenants/{tenant_id}/workspaces/{workspace_id}/trash/pending_purge/
tenants/{tenant_id}/workspaces/{workspace_id}/audit/events/
tenants/{tenant_id}/workspaces/{workspace_id}/audit/replay/
```

Rules:

```text
Never mix tenant files.
Never store raw files without registry records.
Never purge audit/replay metadata with file content.
```

---

# 6. Deployment Modes

## Local development

Use:

```text
npm install
Docker Compose dependencies
local dev auth
local object storage
local PostgreSQL/Qdrant
```

## MVP demo deployment

Use:

```text
Docker Compose
single server
reverse proxy
HTTPS
persistent volumes
basic backups
```

## Production later

Use:

```text
Kubernetes or managed containers
managed PostgreSQL
S3-compatible storage
external auth/SSO
separate workers
observability stack
backup/restore automation
```

---

# 7. Required Persistent Volumes

```text
postgres_data
qdrant_data
minio_data
nats_data
api_logs
worker_logs
```

Backups must include:

```text
PostgreSQL database
MinIO bucket
Qdrant collections
configuration/environment
```

---

# 8. Health Checks

Each service must expose health status.

API:

```text
GET /health
GET /health/ready
GET /health/live
```

Workers:

```text
worker heartbeat
queue subscription status
last successful job
last failed job
```

Dependencies:

```text
PostgreSQL reachable
Qdrant reachable
MinIO reachable
Queue reachable
```

---

# 9. Observability Minimum

MVP must track:

```text
API request count
API error count
upload count
extraction job count
extraction failures
queue depth
search latency
execution failures
restore failures
permission failures
AI/system ticket creation
```

Minimum logs:

```text
structured JSON logs
request_id
correlation_id
tenant_id
workspace_id
actor_type
actor_id
event_type
```

---

# 10. Backup & Recovery

MVP backup requirements:

```text
nightly PostgreSQL backup
nightly MinIO bucket backup
Qdrant snapshot backup if available
configuration backup
manual restore procedure documented
```

Critical rule:

```text
Recovery snapshots inside the app are not a replacement for infrastructure backups.
```

Both are required.

---

# 11. Security Infrastructure Requirements

Minimum:

```text
HTTPS in deployed environment
secure cookies/session settings
secrets outside git
upload size limits
MIME validation
path traversal protection
tenant isolation
backend permission enforcement
restricted admin APIs
structured audit logs
```

Recommended later:

```text
ClamAV scanning
OIDC/Keycloak
rate limiting
WAF/reverse proxy security headers
secret manager
S3 bucket encryption
PostgreSQL encryption at rest
```

---

# 12. Example docker-compose Services

The actual compose file should include services equivalent to:

```yaml
services:
  web:
    build: ./apps/web
    depends_on:
      - api

  api:
    build: ./apps/api
    env_file:
      - .env
    depends_on:
      - postgres
      - qdrant
      - minio
      - nats

  worker-extraction:
    build: ./services/extraction
    env_file:
      - .env
    depends_on:
      - postgres
      - minio
      - nats

  postgres:
    image: postgres:16

  qdrant:
    image: qdrant/qdrant:latest

  minio:
    image: minio/minio:latest

  nats:
    image: nats:latest
```

The exact file should be created later in:

```text
infrastructure/compose/docker-compose.yml
```

---

# 13. Launch Blockers

Do not deploy MVP if any are missing:

```text
persistent database volume
persistent object storage volume
working health checks
working backup procedure
secrets excluded from git
upload size limits
MIME validation
backend permission enforcement
basic observability logs
trashbin retention configured
```

---

# 14. Implementation Targets

```text
infrastructure/compose/docker-compose.yml
infrastructure/compose/.env.example
infrastructure/postgres/init.sql
infrastructure/minio/create-buckets.sh
infrastructure/qdrant/create-collections.sh
infrastructure/observability/logging.md
scripts/dev-up.sh
scripts/dev-down.sh
scripts/backup-postgres.sh
scripts/backup-minio.sh
scripts/restore-postgres.sh
scripts/restore-minio.sh
apps/api/src/health/health.controller.ts
services/*/src/health/workerHealth.ts
```
