# ROADMAP

## Phase 1 - Foundation

- Define product vision
- Define architecture
- Define modules
- Define MVP

Status: Complete for local MVP.

---

## Phase 2 - Core MVP Build

### Goal

Build a working local system that indexes files and supports AI search and chat.

### Tasks

- File scanner
- Metadata storage
- Document parsing
- Embedding pipeline
- Basic search
- Integrate AnythingLLM

Status: Mostly complete for local MVP. Metadata indexing, document parsing, keyword search, local deterministic token embeddings, semantic-style related search, duplicate detection, file watching, and an optional AnythingLLM document sync bridge are implemented. Neural embeddings remain a future quality upgrade.

---

## Phase 3 - AI Layer Integration

### Goal

Enable AI understanding of files.

### Tasks

- Connect Ollama
- Enable chat with files
- Add source references
- Add summarization

Status: Ollama chat with source references is implemented using `qwen3.5:2b` in local validation. Deterministic summaries/classification/entities are implemented, with optional Ollama summaries available.

---

## Phase 4 - Organization Engine

### Goal

Add AI-driven file organization suggestions.

### Tasks

- Tag suggestions
- Rename suggestions
- Folder suggestions
- Confidence scoring
- Preview UI

Status: Implemented for local MVP with safe previews.

---

## Phase 5 - Safe Execution Layer

### Goal

Enable safe file operations.

### Tasks

- Approval flow
- File move
- File rename
- Undo system
- Audit log

Status: Implemented for approved rename/move plus undo and audit. Delete handling is intentionally not implemented.

---

## Phase 6 - Knowledge Layer

### Goal

Transform files into structured knowledge.

### Tasks

- Entity extraction
- Knowledge pages
- Relationships

Status: Basic knowledge layer is implemented through insight-derived entities, classifications, file preview, related file references, and a local system overview dashboard. Rich generated wiki pages remain future enhancement.

---

## Phase 7 - Advanced Features

- Duplicate detection
- Automation rules
- Performance optimization
- Multi-user support

Status: Duplicate detection is implemented. Automation rules, performance optimization, and multi-user support remain future work.

---

## Long-term vision

EverythingApp becomes a full local AI operating system for knowledge and files.
