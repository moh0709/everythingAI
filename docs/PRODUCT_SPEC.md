# PRODUCT SPECIFICATION

## Product name

EverythingApp

## Repository name

EverythingAI

## Product category

Local-first AI knowledge base, file search, file intelligence, and AI-assisted file organization system.

## Core problem

Users and companies store valuable knowledge across folders, PDFs, Word documents, spreadsheets, code files, images, emails, exports, and random file structures. Traditional file search finds filenames, but it does not understand the content, relationships, meaning, or best organization of the files.

EverythingApp solves this by turning the local filesystem into an AI-searchable and AI-organizable knowledge base.

## Main user outcomes

1. Find any file fast.
2. Ask questions across all indexed files.
3. Get answers with references to source files.
4. Preserve knowledge even if files are moved or deleted.
5. Understand what files contain without opening them.
6. Generate structured knowledge pages from raw documents.
7. Suggest better folders, filenames, and tags.
8. Safely organize files with preview, approval, audit log, and undo.

## Core product capabilities

### 1. File indexing

The app scans selected drives and folders and stores metadata such as filename, full path, extension, size, created date, modified date, hash, and indexing status.

### 2. Content extraction

The app extracts text and structured content from supported files such as PDF, DOCX, XLSX, TXT, HTML, Markdown, CSV, and images through OCR.

### 3. Search

The app supports both keyword search and semantic search.

Keyword search is used for exact matches, filenames, paths, and terms.
Semantic search is used for meaning-based discovery.

### 4. AI chat

The user can ask questions about files and documents. Answers must include source references where possible.

### 5. Knowledge base generation

The app can generate Wikipedia-style pages for topics, companies, customers, products, suppliers, projects, people, or internal entities discovered in documents.

### 6. File organization

The app suggests:

- Better filenames
- Better folder locations
- Tags
- Categories
- Duplicate handling
- Archive candidates

### 7. Safe action execution

The app must never silently perform risky file actions in early versions.

Required safety flow:

```text
Scan → Analyze → Suggest → Preview → Approve → Execute → Log → Undo available
```

### 8. Local-first privacy

The app should work locally by default and support local LLMs through Ollama.

Cloud models may be optional, but not required for the core product.

## MVP scope

The MVP should include:

1. Select folder/drive to index.
2. Store file metadata.
3. Extract text from common document types.
4. Generate embeddings.
5. Search by filename and content.
6. Chat with indexed documents.
7. Show source references.
8. Suggest file tags and folder categories.
9. Preview suggested file moves/renames.
10. Log all actions.

## Out of scope for MVP

- Fully autonomous file moving without approval
- Enterprise permission model
- Cloud synchronization
- Mobile app
- Real-time multi-user collaboration
- Full email indexing
- Full browser history indexing

## Success criteria

The MVP is successful when a user can index a folder, ask meaningful questions about its contents, find source files, and receive safe organization suggestions with no destructive actions performed automatically.
