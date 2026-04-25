# PROJECT ASSESSMENT — MUST-HAVE IMPROVEMENTS

## Assessment summary

The current EverythingAI / EverythingApp plan is strong and correctly positioned as a centralized platform with local client agents. The most important architectural correction has already been made: the system is no longer designed as a local-only desktop app, but as a client-server platform with browser access and installed local agents.

The project can work well, but to work flawlessly it needs several must-have improvements before deeper AI features are added.

## Overall assessment

Current foundation quality: strong.

Current implementation maturity: early prototype.

Main risk: moving into AI/RAG too early before the sync, identity, persistence, and safety layers are stable.

Recommended next focus:

```text
Stability → Persistence → Sync correctness → Security → Search → AI
```

## Must-have improvement 1 — Persistent database before anything else

The current API uses in-memory storage. This is fine for a prototype, but not usable as a real foundation.

Required:

- Add PostgreSQL
- Add Prisma ORM
- Add migrations
- Add device table
- Add file table
- Add scan session table
- Add action/audit tables

Reason:

Without persistence, all indexed data disappears after server restart.

Priority: Critical.

## Must-have improvement 2 — Stable device identity

The current client registers a new device every scan. That is not correct for production.

Required:

- Generate a persistent client/device ID on first install.
- Store it locally on the client.
- Reuse the same ID for every sync.
- Add device token rotation later.

Reason:

Without stable device identity, the server cannot reliably track which files belong to which machine.

Priority: Critical.

## Must-have improvement 3 — Workspace / tenant model from day one

The architecture supports companies and browser access, so tenant isolation is mandatory.

Required tables/concepts:

- tenant/company
- workspace
- user
- device
- file
- membership/role

Reason:

If this is added later, many tables and APIs will need to be rewritten.

Priority: Critical.

## Must-have improvement 4 — Client sync protocol

The system needs a real sync protocol, not only upload-all-files.

Required:

- scan_session_id
- batch upload
- last_seen_at
- deleted/moved/renamed detection
- sync checkpoints
- retry queue
- idempotency keys

Reason:

Large folders cannot be reliably synced by sending everything every time.

Priority: Critical.

## Must-have improvement 5 — Avoid hashing entire large files by default

The current client hashes each file by reading the full file. This can be slow and memory-heavy for large files.

Required:

- file size threshold
- partial hash option
- full hash only when needed
- skip rules for huge files
- streaming hash instead of reading full file into memory

Reason:

Large video/audio/database/archive files can freeze or slow the agent.

Priority: Critical.

## Must-have improvement 6 — Exclude rules and safe folder boundaries

The client must not blindly scan everything.

Required:

- exclude folders
- exclude extensions
- max file size
- max depth
- ignore system folders
- ignore node_modules, .git, cache, temp folders

Reason:

Without exclude rules, scans become slow, noisy, and risky.

Priority: Critical.

## Must-have improvement 7 — Command queue for file actions

The server should never directly assume a local operation can happen.

Required:

- server-side command queue
- client polling or websocket
- command status lifecycle
- result reporting
- undo metadata

Status lifecycle:

```text
proposed → approved → queued → sent_to_client → executing → succeeded/failed → undo_available
```

Reason:

This is mandatory for safe client-server execution.

Priority: Critical.

## Must-have improvement 8 — Action approval must be separate from action execution

Approving an action in browser should not directly move/rename files.

Required:

- approval record
- command generation
- client confirmation
- execution result
- audit log

Reason:

The client may be offline, the file may have moved, or the operation may fail.

Priority: Critical.

## Must-have improvement 9 — Audit log and immutable event history

The system needs an event history from the beginning.

Required events:

- device registered
- scan started
- scan completed
- file discovered
- file updated
- file missing/deleted
- action proposed
- action approved
- action executed
- action failed
- action undone

Reason:

This is essential for trust, debugging, and enterprise use.

Priority: Critical.

## Must-have improvement 10 — Clear storage modes

The product supports both metadata/knowledge mode and full document archive mode. This must be formalized early.

Required modes:

### Metadata-only mode

Store only file metadata.

### Knowledge mode

Store extracted text and embeddings.

### Archive mode

Store original file copy on server/object storage.

Reason:

Privacy, storage cost, and compliance depend on this.

Priority: High.

## Must-have improvement 11 — Encryption and secure transport

The client-server design requires strict security.

Required:

- HTTPS only in production
- device authentication token
- user authentication
- tenant isolation
- secrets never committed
- signed server commands to client

Reason:

The system handles filenames, paths, document text, and potentially sensitive company data.

Priority: Critical.

## Must-have improvement 12 — API validation and consistent errors

The API currently accepts raw JSON without validation.

Required:

- schema validation with Zod or Joi
- consistent error responses
- request size limits
- rate limiting
- payload validation

Reason:

Bad or oversized client payloads can break the server.

Priority: High.

## Must-have improvement 13 — File identity model

A file should not only be identified by path or hash.

Recommended identity model:

- device_id
- workspace_id
- normalized_path
- file_size
- modified_at
- content_hash
- optional platform file id if available

Reason:

Paths change, hashes can be expensive, and duplicate files can share hashes.

Priority: High.

## Must-have improvement 14 — Separate metadata search from AI search

Do not depend on LLM/RAG for basic search.

Required:

- fast filename/path search
- metadata filters
- extension filters
- date filters
- size filters
- semantic search later

Reason:

EverythingApp must feel fast before it feels smart.

Priority: High.

## Must-have improvement 15 — Local client cache

The client should keep local scan state.

Required:

- local SQLite cache
- last scan state
- file state table
- retry queue
- pending commands

Reason:

Without local state, the client cannot reliably detect changes or continue after interruption.

Priority: High.

## Must-have improvement 16 — Worker queue for document processing

Document extraction, OCR, embeddings, and AI should not run inside request handlers.

Required:

- queue system
- worker service
- job status
- retry handling
- dead-letter queue

Reason:

File ingestion must remain fast and stable while heavy processing runs asynchronously.

Priority: High.

## Must-have improvement 17 — AnythingLLM integration boundary

Do not deeply fork AnythingLLM too early.

Recommended approach:

1. Build EverythingApp indexer and metadata layer independently.
2. Integrate AnythingLLM through API or connector.
3. Only fork deeply when integration limits become clear.

Reason:

A deep fork too early can make updates difficult and slow development.

Priority: High.

## Must-have improvement 18 — Tests before file execution

Before any move/rename executor is enabled, add tests.

Required:

- dry-run tests
- path safety tests
- undo tests
- duplicate filename conflict tests
- permission error tests

Reason:

File operations are the most dangerous part of the product.

Priority: Critical.

## Recommended revised next build order

### Step 1

Add `.gitignore`, root setup instructions, and environment examples.

### Step 2

Refactor API into clean modules.

### Step 3

Add PostgreSQL + Prisma.

### Step 4

Add tenant/workspace/device/file schema.

### Step 5

Add persistent device identity in client agent.

### Step 6

Add batching, excludes, file size limits, and streaming hash.

### Step 7

Add browser dashboard listing devices and files.

### Step 8

Add search and filters.

### Step 9

Add worker queue for content extraction.

### Step 10

Add embeddings/RAG/AnythingLLM integration.

## Final recommendation

Do not start with AI features yet.

The system will only work flawlessly if the foundation is stable first:

```text
Identity + Persistence + Sync + Security + Safety
```

After those are solid, AI/RAG becomes powerful instead of fragile.
