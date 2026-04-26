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

This repository contains the product and technical documentation foundation plus the local API-first file brain MVP.

## Local file brain MVP

The runnable MVP lives in `services/api`. It scans a local folder, reads file metadata, computes SHA-256 content hashes, extracts document text, searches metadata/content with SQLite FTS, answers through local Ollama, and safely organizes files after preview and approval.

File move/rename execution is available only through an explicit approved action preview. Delete actions are not implemented.

### Install

```bash
cd services/api
npm install
```

### Run the local app

```powershell
$env:OLLAMA_MODEL="qwen3.5:2b"
npm start
```

Open:

```text
http://127.0.0.1:4100
```

The default local development token is:

```text
replace-with-your-local-development-token
```

The UI includes local browser settings for saving the API token and preferred folder path. Provider settings such as Ollama and AnythingLLM remain server environment variables.

### Index a folder

```bash
npm run index -- "C:\path\to\test-folder"
```

By default, the SQLite database is written to `services/api/data/everythingai.sqlite`.

To choose a database path:

```bash
npm run index -- "C:\path\to\test-folder" -- --db "C:\path\to\everythingai.sqlite"
```

### List indexed records

```bash
npm run files:list -- -- --limit 20
```

Optional filters:

```bash
npm run files:list -- -- --status failed
npm run files:list -- -- --query invoice
```

### Extract document text

Supported first-pass extraction types:

- `.txt`
- `.md`
- `.csv`
- `.pdf`
- `.docx`
- `.xlsx`

```bash
npm run extract
```

For one file:

```bash
npm run extract -- -- --file-id "<file-id>"
```

### Search indexed files

```bash
npm run search -- "supplier contract"
```

Search uses SQLite FTS over filename, path, extension, and extracted content. Results include source paths and snippets where available.

Semantic-style related search:

```bash
npm run embeddings -- --limit 1000
npm run semantic -- "supplier contract renewal"
```

This uses local deterministic token embeddings over extracted text. It is not a neural embedding model yet, but it provides stored vector-style related-content retrieval without external services.

### Prepare local chat retrieval

```bash
node src/index.js chat "Which files mention supplier contracts?"
```

By default, this returns retrieval sources and a prompt-ready fallback response. To generate a real local answer, run Ollama locally and set a model:

```bash
OLLAMA_MODEL=qwen3.5:2b node src/index.js chat "Which files mention supplier contracts?"
```

Optional environment variables:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:2b
OLLAMA_TIMEOUT_MS=120000
OLLAMA_NUM_PREDICT=192
```

The chat path calls Ollama's local `/api/chat` endpoint only when `OLLAMA_MODEL` is configured. It does not call cloud providers. AnythingLLM integration is available separately as an optional extracted-document sync bridge.

### Generate file insights

```bash
npm run insights -- --limit 25
```

Insights include deterministic summary, classification, and basic entity extraction. Add `--ollama` to generate summaries through the configured Ollama model.

### Find duplicates

```bash
npm run duplicates
```

Duplicates are grouped by content hash.

### Watch a folder

```bash
npm run watch -- "C:\path\to\folder"
```

The watcher performs an initial scan/extract and re-indexes when files change while the process is running.

### Generate preview-only organization suggestions

```bash
npm run suggest -- "<file-id>"
```

Suggestions may include tags, category, safer filename, or better folder category. The suggestion engine uses Organizor2-inspired content/type rules adapted into `services/api/src/integrations/organizor`. Suggestions are stored as preview records only and always require approval.

### Create safe action previews

```bash
npm run preview -- "<suggestion-id>"
```

Action previews validate the suggestion before execution. Rename and move previews check for path traversal and target conflicts. All previews set `requires_approval`.

### Execute approved organization actions

```bash
npm run execute -- "<preview-id>" --approve
```

Supported execution actions:

- app-level tag
- app-level category
- rename file
- move file into the previewed folder

Undo supported filesystem actions:

```bash
npm run undo -- "<execution-id>" --approve
```

### API endpoints

Start the API:

```bash
npm start
```

Use `Authorization: Bearer <API_TOKEN>` for protected routes.

- `POST /api/index` with `{ "folderPath": "C:\\path\\to\\folder" }`
- `POST /api/extract` with optional `{ "fileId": "...", "limit": 1000 }`
- `GET /api/status`
- `GET /api/files?q=invoice&limit=20`
- `GET /api/search?q=supplier&limit=20`
- `GET /api/semantic-search?q=supplier&limit=10`
- `POST /api/embeddings` with optional `{ "fileId": "...", "limit": 1000 }`
- `POST /api/chat` with `{ "question": "Which files mention supplier?" }`
- `POST /api/insights` with optional `{ "fileId": "...", "limit": 25, "useOllama": false }`
- `GET /api/duplicates`
- `GET /api/files/:fileId/preview`
- `GET /api/knowledge`
- `POST /api/watch` with `{ "folderPath": "C:\\path\\to\\folder", "extract": true }`
- `POST /api/unwatch` with `{ "folderPath": "C:\\path\\to\\folder" }`
- `POST /api/suggestions` with `{ "fileId": "..." }`
- `POST /api/action-previews` with `{ "suggestionId": "..." }`
- `POST /api/action-executions` with `{ "previewId": "...", "approve": true }`
- `POST /api/action-executions/:executionId/undo` with `{ "approve": true }`
- `GET /api/action-executions`
- `GET /api/audit-log`
- `GET /api/labels`
- `POST /api/integrations/anythingllm/sync` with optional `{ "fileId": "...", "limit": 25 }`

### AnythingLLM sync

EverythingAI can optionally upload extracted local file knowledge into an AnythingLLM workspace using AnythingLLM's document upload API.

Configure:

```bash
ANYTHINGLLM_BASE_URL=http://127.0.0.1:3001
ANYTHINGLLM_API_KEY=your-api-key
ANYTHINGLLM_WORKSPACE_SLUG=everythingai
ANYTHINGLLM_UPLOAD_PATH=/api/v1/document/upload
```

Sync extracted files:

```bash
npm run sync:anythingllm -- --limit 25
```

The sync exports extracted text with source path metadata. It does not replace EverythingAI's local SQLite index.

### Safety behavior

The indexer skips symlink traversal and known unsafe/system/dependency paths such as Windows system folders, recycle-bin folders, `.git`, and `node_modules`. Per-file errors are logged and stored without stopping the scan. File execution requires a safe preview plus explicit approval. Delete actions are not implemented.

### Validation

```bash
npm test
npm audit --omit=dev
```

## Next architectural decision

The next step is to decide whether to:

1. Fork AnythingLLM directly into this repo or a separate upstream fork.
2. Keep this repo as the product/specification repository.
3. Build a proof-of-concept filesystem indexer before modifying AnythingLLM.
