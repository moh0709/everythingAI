# ANYTHINGLLM FORK STRATEGY

## Goal

Use AnythingLLM as the base product and extend it into EverythingApp.

## Why AnythingLLM

It already provides:

- Chat with documents
- RAG pipeline
- Workspaces
- Agent system
- Local model support (Ollama)
- UI and API

This allows us to skip months of development.

## What we keep

- Chat UI
- RAG system
- Document ingestion
- API layer
- Workspace system

## What we extend

### 1. File system indexing layer

Add:

- Full-drive scanning
- File watcher
- Metadata DB

### 2. Metadata integration

Link AnythingLLM documents to:

- real file paths
- hashes
- timestamps

### 3. Organization engine

Add:

- AI suggestions
- structured action proposals
- confidence scoring

### 4. Safe execution layer

Add:

- preview UI
- approval flow
- undo system
- audit log

### 5. Knowledge layer

Add:

- entity extraction
- knowledge pages
- relationships

## Architecture approach

```text
AnythingLLM (base)
      ↓
Filesystem Indexer (new)
      ↓
Metadata DB (new)
      ↓
AI Organization Engine (new)
      ↓
Safe Execution Layer (new)
```

## Implementation plan

1. Run AnythingLLM locally.
2. Build external indexing service.
3. Connect indexing service to AnythingLLM API.
4. Extend UI to show file-level metadata.
5. Add organization suggestion UI.
6. Add execution layer.

## Key principle

Do not modify AnythingLLM core heavily at first.

Build extensions around it, then gradually merge deeper if needed.
