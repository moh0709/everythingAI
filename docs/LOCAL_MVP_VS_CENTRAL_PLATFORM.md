# LOCAL MVP VS CENTRAL PLATFORM

## Purpose

This document clarifies the difference between the current runnable prototype and the long-term EverythingApp architecture.

## Current implementation status

The current implementation is a **local single-machine MVP**.

It runs as:

```text
Windows/local machine
  └─ services/api
      ├─ Express API
      ├─ Static local browser UI
      ├─ SQLite database
      ├─ Local folder scanner
      ├─ Local extraction/search/insights
      └─ Local safe file action executor
```

This is intentionally simpler than the final platform so we can prove the core file-brain workflow quickly.

## Current local MVP responsibilities

The local MVP currently owns:

- Local folder indexing
- File metadata storage in SQLite
- Text extraction
- SQLite FTS search
- Deterministic vector-style related search
- Local Ollama chat integration when configured
- Organization suggestions
- Action previews
- Explicit approval before execution
- Local move/rename execution
- Undo support
- Audit log
- Optional AnythingLLM sync bridge

## What the local MVP is not

The current MVP is **not yet** the full centralized client/server architecture.

It does not yet include:

- Central PostgreSQL server
- pgvector production vector database
- Multi-user tenant model
- Stable installed client device identity
- Browser approval controlling remote clients
- Server command queue to installed clients
- Real client/server sync protocol
- Enterprise permissions

## Long-term central platform architecture

The target architecture remains:

```text
Installed Client Agent
  ↓
Central Server API
  ↓
PostgreSQL source-of-truth database
  ↓
pgvector / vector database
  ↓
Keyword search service
  ↓
AnythingLLM / RAG layer
  ↓
Browser UI
  ↓
Approved commands back to Client Agent
  ↓
Client executes local file actions
```

## Key difference

### Local MVP

The API runs on the same machine as the files and can execute approved local filesystem actions directly.

### Central platform

The server must not directly access local files. It sends approved commands to an installed client agent, and the client executes the action locally.

## Why we start local-first

The local MVP lets us validate:

1. File indexing
2. Metadata storage
3. Extraction
4. Search
5. AI-assisted retrieval
6. Organization suggestions
7. Safety preview workflow
8. Undo and audit logging

Once these workflows are stable, we can split the system into a real client/server platform.

## Migration path

```text
Step 1: Stabilize local MVP
Step 2: Separate local scanner/executor from API
Step 3: Add stable client identity
Step 4: Add central PostgreSQL schema
Step 5: Add sync protocol
Step 6: Add command queue
Step 7: Move browser UI to central server model
Step 8: Replace local vector-style search with pgvector/Qdrant
```

## Rule for future development

Do not confuse local MVP shortcuts with final platform architecture.

Local MVP can execute approved file actions directly because it runs locally.

Central platform must always use:

```text
User approval → server command queue → installed client execution → client result report → audit log
```
