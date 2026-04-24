# EverythingAI / EverythingApp

EverythingAI is the project foundation for **EverythingApp**: a local-first AI-powered file brain inspired by the speed of Everything search and expanded with document understanding, semantic search, AI chat, knowledge-base generation, and safe file organization.

## One-sentence definition

**EverythingApp is a local AI-powered file brain that indexes full drives, understands file and document contents, remembers filenames and paths, answers questions with source references, generates Wikipedia-style knowledge pages, and safely suggests or performs file organization such as tagging, renaming, and moving files.**

## Strategic direction

The recommended strategy is to evaluate and potentially fork **AnythingLLM** as the base product, then expand it with the missing filesystem intelligence layer.

AnythingLLM already covers much of the foundation:

- Document ingestion
- RAG/chat with documents
- Workspaces
- Local/cloud LLM support
- Ollama support
- Agents
- API access
- Desktop/self-hosted deployment

EverythingApp adds the unique product layer:

- Full-drive indexing
- File metadata database
- File watcher and sync engine
- Filename/path intelligence
- Safe AI-based file organization
- Preview-before-action workflow
- Undo and audit log
- Wiki-style generated knowledge pages
- Entity and relationship extraction

## Documentation

See the `/docs` folder:

- [`PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)
- [`PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
- [`ANYTHINGLLM_FORK_STRATEGY.md`](docs/ANYTHINGLLM_FORK_STRATEGY.md)
- [`MODULE_CHECKLIST.md`](docs/MODULE_CHECKLIST.md)
- [`AI_ORGANIZATION_ENGINE.md`](docs/AI_ORGANIZATION_ENGINE.md)
- [`DATA_MODEL.md`](docs/DATA_MODEL.md)
- [`SECURITY_AND_FILE_SAFETY.md`](docs/SECURITY_AND_FILE_SAFETY.md)
- [`MVP_SCOPE.md`](docs/MVP_SCOPE.md)
- [`ROADMAP.md`](docs/ROADMAP.md)
- [`DECISIONS.md`](docs/DECISIONS.md)

## Initial stack recommendation

```text
Frontend: React + TypeScript + Tauri/Desktop shell
Base product candidate: AnythingLLM fork
Backend: Node.js from AnythingLLM + optional Python FastAPI services for indexing/parsing
Database: PostgreSQL + pgvector
Keyword search: Meilisearch or OpenSearch
Document parsing: Apache Tika / Docling / Unstructured
OCR: Tesseract
LLM runtime: Ollama
Embeddings: nomic-embed-text or BGE models
File actions: custom safe executor with preview, approval, audit log, and undo
```

## Current status

This repository currently contains the product and technical documentation foundation. The next step is to decide whether to:

1. Fork AnythingLLM directly into this repo or a separate upstream fork.
2. Keep this repo as the product/specification repository.
3. Build a proof-of-concept filesystem indexer before modifying AnythingLLM.
