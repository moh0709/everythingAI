# IMPLEMENTATION PLAN

## Purpose

This document is the execution plan for the first implementation agent working on EverythingAI / EverythingApp.

EverythingAI is a local-first AI-powered file brain. The first implementation phase should prove that the product can index local files, extract metadata and content, search them, answer questions with source references, and suggest safe organization actions.

## Key refinement

EverythingAI should not rebuild the file organization layer from scratch.

The existing `Organizor2` project should be treated as a reusable source of implementation ideas and possibly code for:

- AI-driven file analysis
- Metadata and content extraction
- Multi-provider AI service abstraction
- File organization suggestions
- Backup and restore concepts
- File safety and validation
- Logging, caching, and progress tracking
- React + TypeScript UI patterns

EverythingAI remains the broader product. Organizor2 becomes the reference implementation for the file intelligence and organization engine.

## Implementation strategy

Start with a minimal custom MVP, while keeping the architecture compatible with later AnythingLLM integration.

The MVP should be built around separate agents/modules:

1. Filesystem Indexer Agent
2. Metadata Store Agent
3. Document Extraction Agent
4. Embedding and Search Agent
5. File Chat Agent
6. Organization Suggestion Agent
7. Safe Action Preview Agent
8. Audit and Undo Agent

No file move, rename, delete, or destructive operation should run automatically. All actions must go through preview and explicit approval.

## Phase 0 — Repository preparation

### Goals

Prepare the repository for real implementation work.

### Tasks

- Confirm whether this repo will contain the app implementation directly.
- Add an implementation scaffold if none exists.
- Keep `/docs` as the product and architecture source of truth.
- Add clear module boundaries before writing large amounts of code.
- Decide package structure for frontend, backend, and shared types.

### Recommended structure

```text
/apps
  /desktop
  /api
/packages
  /core
  /file-indexer
  /extractors
  /ai-providers
  /search
  /organization-engine
  /safe-actions
  /shared
/docs
```

## Phase 1 — Foundation Builder Agent

### Objective

Create the first working local foundation.

The user should be able to select or provide a folder path, scan files, extract metadata, and store index records locally.

### Deliverables

- Project scaffold
- Local development scripts
- File scanner module
- File metadata model
- Local database setup
- Basic CLI or API endpoint for indexing a folder
- Logging and progress reporting

### Initial metadata fields

```text
id
filename
absolute_path
relative_path
extension
mime_type
size_bytes
created_at
modified_at
content_hash
index_status
last_indexed_at
error_message
```

### Acceptance test

Given a local folder path, the system should scan supported files and store metadata records without moving or modifying any files.

## Phase 2 — Document Extraction Agent

### Objective

Extract useful text and metadata from common file types.

### Initial file support

- TXT
- MD
- CSV
- PDF
- DOCX
- XLSX

### Deliverables

- Extractor interface
- Per-file-type extractor implementations
- Extracted text storage
- Extraction status and errors
- Chunking strategy for long documents

### Organizor2 reuse candidates

Review and adapt Organizor2 extractor concepts, especially:

- Advanced text extraction
- PDF extraction
- Document extraction
- Spreadsheet extraction
- Content extraction abstraction
- File validation and sanitization

### Acceptance test

The system should index a folder, extract text from supported files, and store that text in a searchable form.

## Phase 3 — Search Agent

### Objective

Enable useful retrieval across filename, path, metadata, and content.

### Deliverables

- Keyword search
- Filename search
- Path search
- Content search
- Search result ranking
- Source file references

### Later extension

Add semantic search using embeddings and vector storage after the keyword path works reliably.

### Acceptance test

A user should be able to search for a term and receive matching files with paths, snippets, and metadata.

## Phase 4 — AI Chat Agent

### Objective

Allow the user to ask questions about indexed files and receive answers with source references.

### Deliverables

- Retrieval pipeline
- Prompt builder
- Provider abstraction
- Local Ollama-first setup
- Source references in every answer
- Basic summarization over selected files

### Organizor2 reuse candidates

Review and adapt Organizor2 AI provider abstractions:

- Ollama
- OpenRouter
- Cerebras
- Mistral
- Google
- Retry and caching wrapper

### Acceptance test

A user should be able to ask: "Which files mention project X?" and receive an answer referencing source files.

## Phase 5 — Organization Suggestion Agent

### Objective

Suggest file organization improvements without executing them.

### Suggestions supported in MVP

- Tags
- Category
- Better filename
- Better folder location
- Reason for suggestion
- Confidence score

### Required output model

```text
file_id
action_type
current_value
suggested_value
reason
confidence
risk_level
requires_approval
```

### Organizor2 reuse candidates

Use Organizor2 as the main reference for:

- Content-based categorization
- Metadata-aware organization
- Business context recognition
- Workflow analysis
- Organization strategy patterns

### Acceptance test

Given an indexed file, the system should suggest tags, category, and optional rename/move recommendations without changing the file.

## Phase 6 — Safe Action Preview Agent

### Objective

Create the safety layer before enabling any real file operation.

### Deliverables

- Action preview model
- Approval workflow
- Dry-run execution mode
- Conflict detection
- Path traversal protection
- Backup plan generation
- Audit log entry model

### Non-negotiable rule

No file operation should run unless:

1. The action is previewed.
2. The user explicitly approves it.
3. The action is logged.
4. Undo information is available where possible.

### Acceptance test

The system can show a proposed rename or move operation as a preview and refuse to execute it without approval.

## Phase 7 — Safe Execution and Undo Agent

### Objective

Enable approved rename and move actions with audit and undo.

### MVP operations

- Rename file
- Move file
- Add/update app-level tags

### Out of scope for MVP

- Delete automation
- Permanent destructive cleanup
- Fully automatic organization
- Cloud sync

### Acceptance test

After approval, the system should execute a move or rename, write an audit log entry, and provide enough information to undo the operation.

## Phase 8 — UI Agent

### Objective

Build the user-facing interface for indexing, searching, chatting, and reviewing suggestions.

### Deliverables

- Folder selection screen
- Indexing progress screen
- Search interface
- File detail view
- Chat panel
- Organization suggestions view
- Action preview and approval UI
- Audit log view

### Organizor2 reuse candidates

Review Organizor2 UI patterns for:

- React + TypeScript component structure
- Settings panel
- Provider configuration
- Progress tracking
- Logging and analytics dashboard

## Technical defaults

### Preferred stack

```text
Frontend: React + TypeScript
Desktop shell: Tauri preferred
Backend/API: Node.js TypeScript or Python FastAPI
Local database: SQLite for first MVP, PostgreSQL + pgvector later
Search: SQLite FTS first, Meilisearch/OpenSearch later
Embeddings: Ollama-compatible local embeddings later
LLM: Ollama first, cloud providers optional
```

### Why SQLite first

SQLite keeps the MVP fast and local-first. PostgreSQL and pgvector can be introduced when semantic search and larger-scale indexing are ready.

## First implementation task

The first AI implementation agent should start with this task:

### Task: Build local metadata indexing MVP

Create a minimal runnable system that can:

1. Accept a local folder path.
2. Recursively scan files.
3. Ignore unsafe/system paths.
4. Compute file metadata and content hash.
5. Store records in a local SQLite database.
6. Print or return indexing results.
7. Never move, rename, or delete files.

### Definition of done

- A developer can run one command to index a test folder.
- The system creates or updates a local database.
- Indexed files can be listed from the database.
- Errors are logged without stopping the full scan.
- No source files are modified.

## Immediate next files to create

Recommended initial files:

```text
package.json
/apps/api/package.json
/apps/api/src/index.ts
/apps/api/src/indexer/fileScanner.ts
/apps/api/src/indexer/hash.ts
/apps/api/src/db/schema.sql
/apps/api/src/db/client.ts
/apps/api/src/types/files.ts
```

Alternative if choosing Python first:

```text
/apps/api/pyproject.toml
/apps/api/src/main.py
/apps/api/src/indexer/file_scanner.py
/apps/api/src/indexer/hash.py
/apps/api/src/db/schema.sql
/apps/api/src/db/client.py
/apps/api/src/models/files.py
```

## Working rules for agents

- Prefer small commits.
- Keep docs updated as architecture changes.
- Do not introduce destructive file operations early.
- Keep provider integrations behind interfaces.
- Every AI answer should be source-grounded where possible.
- Every file action must be previewable, auditable, and undoable.
- Reuse Organizor2 concepts where they reduce implementation time.

## Open decisions

- Whether to implement the first backend in Node.js TypeScript or Python FastAPI.
- Whether AnythingLLM is forked immediately or integrated after the metadata indexer works.
- Whether Organizor2 should be imported as code, copied module-by-module, or used only as reference.
- Whether the first UI should be desktop-first or API/CLI-first.

## Recommended decision

Start API/CLI-first with a small local SQLite metadata indexer. Once indexing works, add document extraction and search. Only then integrate UI and AnythingLLM.
