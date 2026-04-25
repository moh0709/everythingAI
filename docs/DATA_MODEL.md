# DATA MODEL

## Core decision

EverythingApp must use **both relational data and vector data**.

A vector database is required, but it should **not** contain all information by itself.

The correct design is a hybrid model:

```text
PostgreSQL = source of truth for structured data
pgvector / vector index = semantic meaning search
Meilisearch/OpenSearch = fast keyword and filename search
Object storage = optional original file archive
```

## Why not store everything only as vectors?

Vectors are excellent for meaning-based search, but they are not good as the only database because they do not replace:

- file metadata
- permissions
- users
- tenants
- exact filename/path search
- audit logs
- action history
- approval workflow
- file operation status
- source-of-truth records

A vector embedding is a mathematical representation of meaning. It is not the original document, not the metadata model, and not enough for reliable file management.

## Recommended storage architecture

```text
Original file / local file
        ↓
files table → metadata and source identity
        ↓
file_chunks table → extracted text chunks
        ↓
embeddings table → vector representation of each chunk
        ↓
vector search → semantic retrieval
        ↓
LLM answer with source references
```

## Core tables

### tenants

Stores company/workspace ownership.

Fields:

- id
- name
- created_at

### users

Stores users that access the browser UI and approve actions.

Fields:

- id
- tenant_id
- email
- name
- role
- created_at

### devices

Stores installed client agents.

Fields:

- id
- tenant_id
- device_name
- hostname
- platform
- agent_version
- device_token_hash
- registered_at
- last_seen_at
- status

### files

Stores indexed files and acts as the source of truth for file identity.

Fields:

- id
- tenant_id
- device_id
- filename
- normalized_path
- full_path
- extension
- mime_type
- size
- created_at
- modified_at
- content_hash
- partial_hash
- indexing_status
- storage_mode
- discovered_at
- last_seen_at

### file_chunks

Stores extracted text chunks.

Fields:

- id
- tenant_id
- file_id
- chunk_text
- chunk_index
- token_count
- page_number
- section_title
- extraction_method
- created_at

### embeddings

Stores vector embeddings for semantic search.

Fields:

- id
- tenant_id
- file_id
- chunk_id
- embedding_model
- embedding_vector
- dimensions
- created_at

Recommended implementation:

```text
PostgreSQL + pgvector for MVP
```

Possible future implementation:

```text
Qdrant / Weaviate for larger scale vector workloads
```

### search_index

Optional table or external Meilisearch/OpenSearch index for fast keyword search.

Indexes:

- filename
- path
- extension
- extracted text
- tags
- dates

### action_proposals

Stores all proposed and executed file actions.

Fields:

- id
- tenant_id
- file_id
- action_type
- source_path
- target_path
- reason
- confidence
- status
- created_by
- approved_by
- created_at
- approved_at
- executed_at

### audit_log

Tracks all important events.

Fields:

- id
- tenant_id
- event_type
- entity_type
- entity_id
- user_id
- device_id
- payload
- created_at

## Relationships

- One tenant → many users
- One tenant → many devices
- One device → many files
- One file → many chunks
- One chunk → one or more embeddings
- One file → many action proposals
- One action proposal → many audit events

## Query types and correct storage

| Query type | Correct system |
|---|---|
| Find exact filename | PostgreSQL + keyword search |
| Find path/folder | PostgreSQL |
| Filter by extension/date/size | PostgreSQL |
| Search exact words in content | Meilisearch/OpenSearch |
| Ask meaning-based question | Vector database |
| Ask AI to summarize | Vector retrieval + LLM |
| Approve file action | PostgreSQL workflow tables |
| Audit who moved a file | PostgreSQL audit log |

## Final database principle

Do not store everything only as vectors.

Store **truth and workflow** in PostgreSQL.

Store **meaning** in pgvector/vector database.

Store **fast keyword lookup** in Meilisearch/OpenSearch.

Store **original files** only when archive mode is enabled.
