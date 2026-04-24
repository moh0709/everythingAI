# TECHNICAL ARCHITECTURE

## High-level architecture

```text
Filesystem
   ↓
File Watcher / Scanner
   ↓
Metadata Database
   ↓
Content Extraction
   ↓
Chunking + Embeddings
   ↓
Vector Database (pgvector)
   ↓
Search Layer (Meilisearch)
   ↓
AI / RAG Layer (AnythingLLM / RAGFlow)
   ↓
API Layer
   ↓
Frontend (Desktop UI)
   ↓
Safe File Executor
```

## Components

### 1. File Watcher / Scanner

Detects new, updated, moved, and deleted files.

### 2. Metadata Database

Stores file metadata such as:

- filename
- path
- hash
- timestamps
- indexing status

### 3. Content Extraction

Uses tools like Apache Tika or Unstructured to extract text.

### 4. Embedding Pipeline

Splits documents into chunks and generates embeddings.

### 5. Vector Database

Stores embeddings for semantic search.

### 6. Search Engine

Provides fast keyword-based search.

### 7. AI Layer

Handles:

- chat
- summarization
- classification
- organization suggestions

### 8. File Organization Engine

Uses AI to propose file moves and renaming.

### 9. Safe File Executor

Executes approved file operations with logging and undo.

## Tech stack

- Frontend: React + Tauri
- Backend: Node.js + Python services
- Database: PostgreSQL + pgvector
- Search: Meilisearch
- AI: Ollama
- Parsing: Apache Tika / Unstructured
- OCR: Tesseract
