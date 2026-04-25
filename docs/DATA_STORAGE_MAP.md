# DATA STORAGE MAP

## Purpose

This document defines exactly what information is stored where in EverythingAI / EverythingApp.

EverythingApp uses a hybrid storage model. No single database should store everything.

## Core storage principle

```text
PostgreSQL = truth, ownership, permissions, workflow, metadata
Vector database = semantic meaning and similarity search
Keyword search = fast exact search over names, paths, and text
Object storage = optional original file archive
Client local cache = local scan state and command execution state
AnythingLLM = RAG/chat workspace and document intelligence layer
```

## Storage layers

### 1. Client machine / local filesystem

This is where the original user files live by default.

Stores:

- Original files
- Original folders
- Real file paths
- Local operating system permissions

Examples:

```text
C:/Users/Moe/Documents/Contracts/supplier-contract.pdf
D:/Company/Invoices/2026/invoice-123.pdf
```

Important:

The server cannot directly move or rename files here. Only the installed client agent can perform local file actions after approval.

---

### 2. Client local cache

The installed client agent should keep a small local database, preferably SQLite.

Stores:

- persistent device ID
- selected scan folders
- local folder permissions
- last scan state
- file state cache
- pending sync queue
- failed sync retries
- pending commands from server
- local undo metadata

Does not store by default:

- full central knowledge base
- all embeddings
- all tenant data

Purpose:

The client cache allows the agent to continue safely after restart, detect changes, avoid re-uploading everything, and execute approved file actions reliably.

---

### 3. Central PostgreSQL database

This is the main source of truth.

Stores:

- tenants / companies
- users
- roles and permissions
- devices / client agents
- workspaces
- selected folder roots
- file metadata
- file identity
- scan sessions
- sync status
- storage mode
- extracted text chunk records
- action proposals
- approvals
- execution status
- audit logs
- knowledge page metadata
- entity records
- relationships

Examples of data stored here:

```text
filename = supplier-contract.pdf
full_path = C:/Users/Moe/Documents/Contracts/supplier-contract.pdf
device_id = laptop-001
tenant_id = omniware
hash = abc123...
indexing_status = extracted
storage_mode = knowledge_only
```

Purpose:

PostgreSQL tells the system what exists, who owns it, where it came from, what state it is in, and what actions have been proposed or executed.

---

### 4. pgvector / vector database

The vector database stores embeddings, not full truth.

Stores:

- embedding vectors
- chunk ID references
- file ID references
- embedding model name
- vector dimensions
- tenant/workspace ID for filtering

Example:

```json
{
  "chunk_id": "chunk_123",
  "file_id": "file_456",
  "embedding_model": "nomic-embed-text",
  "embedding_vector": [0.123, -0.552, 0.881]
}
```

Does not store:

- users
- permissions as source of truth
- audit logs
- approvals
- local file operation status
- exact file management workflows

Purpose:

The vector database answers meaning-based questions such as:

```text
Which files discuss supplier payment terms?
Find documents similar to this invoice.
What files are about customer complaints?
```

Recommended MVP implementation:

```text
PostgreSQL + pgvector
```

Possible future scale option:

```text
Qdrant / Weaviate / Milvus
```

---

### 5. Keyword search index

Use Meilisearch or OpenSearch for fast search.

Stores indexed copies of searchable fields:

- filename
- path
- extension
- tags
- categories
- extracted text
- dates
- file type

Purpose:

This supports fast exact and filtered search:

```text
invoice 2026
filename contains supplier
extension:pdf
folder:contracts
modified after 2026-01-01
```

Why not only vector search?

Vector search is not ideal for exact filenames, paths, filters, dates, and deterministic file lookup.

---

### 6. Object storage / file archive

This is optional and depends on workspace settings.

Possible systems:

- S3-compatible storage
- MinIO
- local server storage
- cloud object storage

Stores only when archive mode is enabled:

- original uploaded file copies
- thumbnails/previews
- extracted attachments
- generated exports

Storage modes:

### Metadata-only mode

Only file metadata is stored centrally.

### Knowledge mode

Extracted text and embeddings are stored centrally, but not the original file.

### Archive mode

Original files are also copied to central object storage.

Purpose:

Archive mode is useful when users need central access to the actual files from browser, backups, or sharing.

---

### 7. Document processing worker storage

Workers may need temporary storage.

Stores temporarily:

- uploaded file processing copies
- extracted text output
- OCR images
- intermediate parser output
- job logs

Important:

Temporary worker files should be cleaned automatically after processing unless archive mode is enabled.

---

### 8. AnythingLLM storage layer

AnythingLLM should be used as an AI/RAG layer, not as the full EverythingApp source of truth.

AnythingLLM can store/manage:

- documents inside workspaces
- parsed document text
- embeddings
- vector database configuration
- chat history
- source citations
- LLM provider settings
- agent tools

EverythingApp should still own:

- client devices
- local filesystem paths
- tenant/company model
- sync status
- file watcher state
- file action approvals
- local execution status
- audit log
- undo model
- organization workflow

Recommended relationship:

```text
EverythingApp stores the filesystem truth.
AnythingLLM provides the RAG/chat intelligence.
```

---

## What is stored where?

| Information type | Stored where | Why |
|---|---|---|
| Original local file | Client filesystem | Source file remains with user by default |
| Original archived copy | Object storage | Only if archive mode is enabled |
| Filename | PostgreSQL + keyword index | Needed for exact search and source reference |
| Full path | PostgreSQL + keyword index | Needed to locate original file |
| File hash | PostgreSQL + client cache | Needed for change/duplicate detection |
| File size/date/type | PostgreSQL + keyword index | Needed for filters and sync |
| Device ID | Client cache + PostgreSQL | Needed to link files to client machine |
| User/company/workspace | PostgreSQL | Ownership and permissions |
| Extracted text | PostgreSQL file_chunks or document store | Needed for citations and indexing |
| Text chunks | PostgreSQL | Needed for traceability |
| Embeddings | pgvector / vector DB | Needed for semantic search |
| Keyword searchable fields | Meilisearch/OpenSearch | Needed for fast search |
| AI chat history | AnythingLLM or PostgreSQL | Depends on integration strategy |
| AI source references | PostgreSQL + AnythingLLM | Needed to prove answer origin |
| Tags/categories | PostgreSQL + keyword index | Needed for organization |
| File action proposal | PostgreSQL | Workflow source of truth |
| Approval status | PostgreSQL | User decision record |
| File action command | PostgreSQL command queue | Server-to-client execution |
| Execution result | PostgreSQL + audit log | Proof of result |
| Undo metadata | PostgreSQL + client cache | Needed to reverse actions |
| Audit log | PostgreSQL | Compliance and debugging |
| Temporary parsing files | Worker temp storage | Processing only |

---

## Example flow

### A PDF is discovered on a user laptop

```text
1. File exists locally on laptop.
2. Client agent scans it.
3. Client stores scan state in local cache.
4. Client sends metadata to server.
5. PostgreSQL stores file record.
6. Worker extracts text.
7. PostgreSQL stores text chunks.
8. Embedding model converts chunks to vectors.
9. pgvector stores embeddings.
10. Meilisearch indexes filename/path/text.
11. AnythingLLM can use the document/chunks for chat.
12. Browser user asks a question.
13. System searches vector DB + keyword index.
14. LLM answers with file reference.
```

### AI suggests moving a file

```text
1. AI proposes a new folder.
2. PostgreSQL stores action proposal.
3. Browser shows preview.
4. User approves.
5. PostgreSQL creates command for client.
6. Client receives command.
7. Client checks file still exists.
8. Client executes move locally.
9. Client reports success/failure.
10. PostgreSQL logs result.
11. Audit log records everything.
```

## Final rule

Do not put all information into the vector database.

Use this model:

```text
Truth in PostgreSQL.
Meaning in vector DB.
Speed in keyword index.
Files in filesystem/object storage.
Execution state in client + server logs.
AI chat/RAG in AnythingLLM or integrated RAG service.
```
