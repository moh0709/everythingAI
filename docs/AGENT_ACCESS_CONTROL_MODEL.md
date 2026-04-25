# AGENT ACCESS CONTROL MODEL

## Core decision

AI agents must not have uncontrolled access to all data layers.

Agents should work through controlled APIs, permissions, scoped service accounts, and approval workflows.

## Short answer

Agents can interact with all data layers, but only through controlled access paths.

They should not directly modify databases, vector stores, object storage, or local files unless explicitly permitted by role and workflow.

## Data layer access model

```text
Agent → API / Tool Layer → Permission Check → Workflow Rules → Data Layer
```

Agents should not bypass the API layer.

## Layer-by-layer access

| Layer | Agent access? | Access type |
|---|---|---|
| PostgreSQL | Yes, controlled | Through backend API only |
| Vector DB / pgvector | Yes, controlled | Search/retrieval API, embedding worker |
| Keyword index | Yes, controlled | Search API, indexing worker |
| Object storage | Limited | Upload/read only through document service |
| Client local filesystem | No direct server-side access | Only via installed client agent |
| Client command executor | Limited | Only approved commands |
| Audit log | Write through system only | Agents can read if permitted |
| AnythingLLM | Yes, controlled | Through AnythingLLM API/integration layer |
| Browser UI | Yes | User-approved workflows |

## Agent classes

### 1. Read-only research agent

Can:

- search metadata
- search vectors
- read documents/chunks allowed by permissions
- summarize results

Cannot:

- modify files
- approve actions
- execute actions
- delete data

### 2. Indexing agent

Can:

- create file metadata records
- create chunks
- create embeddings
- update indexing status

Cannot:

- approve file moves
- execute local file operations
- delete original files

### 3. Organization suggestion agent

Can:

- suggest tags
- suggest folders
- suggest filenames
- create action proposals

Cannot:

- execute actions
- approve its own actions
- delete files

### 4. Execution agent / client agent

Can:

- execute approved local commands
- report success/failure
- create undo records

Cannot:

- create its own commands without server approval
- decide to move files autonomously
- bypass approval flow

### 5. Admin agent

Can:

- manage settings
- manage workspace policies
- review audit logs

Should still not bypass safety workflow for destructive actions.

## File operation rule

All file operations must follow:

```text
AI Suggests → User Reviews → User Approves → Server Queues Command → Client Executes → Client Reports Result → Audit Log Records
```

No agent should have direct permission to silently move, rename, or delete user files.

## Vector database access rule

Agents may query the vector database for semantic search, but they should not directly write embeddings unless they are running inside the indexing/embedding pipeline.

Required metadata filters:

- tenant_id
- workspace_id
- user permissions
- file visibility

This prevents cross-tenant data leakage.

## PostgreSQL access rule

PostgreSQL is the source of truth.

Agents should not connect directly to PostgreSQL with raw credentials in normal operation.

They should use backend API endpoints that enforce:

- authentication
- tenant isolation
- role permissions
- audit logging
- validation

## AnythingLLM access rule

AnythingLLM can be used as the RAG/chat layer.

Agents may use AnythingLLM through:

- workspace APIs
- document APIs
- chat APIs
- retrieval APIs

But EverythingApp must still own:

- device identity
- file sync state
- approval workflow
- command queue
- audit logs

## Recommended permission levels

```text
viewer        → read/search only
indexer       → ingest/index data
organizer     → propose actions
approver      → approve actions
executor      → execute approved local actions
admin         → manage workspace/system settings
```

## Critical safety principle

Agents may reason over all permitted information, but they should only act through workflow-controlled APIs.

Access is allowed by role.
Control is limited by workflow.
Execution is always logged.
