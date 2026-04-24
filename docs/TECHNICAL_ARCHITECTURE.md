# TECHNICAL ARCHITECTURE

## Architecture decision

EverythingApp is not only a single local desktop app.

It must support two access modes:

1. **Installed client** on a user's computer.
2. **Browser access** through a web application.

The knowledge, metadata, indexes, users, permissions, and organization decisions should be centralized on a main server and stored in a central database.

## Updated high-level architecture

```text
User Computer / Local Filesystem
   ↓
EverythingApp Client Agent
   ↓
Secure Sync / Upload / Metadata API
   ↓
Central Server API
   ↓
Central Metadata Database
   ↓
Content Extraction + Embedding Pipeline
   ↓
Vector Database + Keyword Search
   ↓
AI / RAG Layer
   ↓
Browser UI + Desktop UI
   ↓
Approved Actions Sent Back to Client Agent
   ↓
Safe Local File Executor
```

## Core architecture principle

The **server is the brain**.

The **client agent is the bridge to the user's local filesystem**.

This means:

- The server stores metadata, extracted knowledge, embeddings, users, permissions, audit logs, and organization proposals.
- The client scans local files, reads allowed folders, sends metadata/content to the server, and executes approved file actions locally.
- The browser can search, chat, review, and approve organization suggestions.
- The server cannot directly move files on a user's computer without the installed client.

## Access modes

### 1. Desktop client mode

The installed client can:

- Scan selected folders/drives.
- Watch for file changes.
- Extract metadata.
- Upload metadata and/or content to the central server.
- Receive approved actions.
- Move/rename files locally after approval.
- Keep a local cache for performance.

### 2. Browser mode

The browser app can:

- Search indexed files.
- Chat with the knowledge base.
- View source references.
- Review AI organization suggestions.
- Approve or reject proposed actions.
- Manage users and settings.

The browser cannot access local files directly unless the desktop client is installed and connected.

## Main server responsibilities

The central server handles:

- Authentication
- User/company/tenant management
- Metadata database
- Document processing pipeline
- Embedding generation
- Vector search
- Keyword search
- AI chat/RAG
- Organization suggestions
- Approval workflow
- Audit log
- Client synchronization

## Client agent responsibilities

The client agent handles:

- Local folder permissions
- File scanning
- File watching
- Local hashing
- Optional local extraction
- Secure upload to server
- Receiving approved actions
- Executing local file operations safely
- Local undo support

## Data storage model

Central server stores:

- File metadata
- Extracted text chunks
- Embeddings
- Knowledge pages
- Tags and categories
- Organization suggestions
- Audit logs
- User permissions

Original files may be handled in two modes:

### Metadata + knowledge mode

The server stores extracted text and metadata, but not necessarily the original file.

### Full document archive mode

The server stores an uploaded copy of the original file for backup, sharing, and centralized access.

This should be configurable per workspace/company.

## File action model

All real file operations must follow:

```text
AI Suggests → User Reviews → User Approves → Server Sends Command → Client Executes → Client Reports Result → Server Logs Action
```

The server should never assume a file operation succeeded until the client confirms it.

## Updated tech stack

- Desktop client: Tauri + React + Rust filesystem access
- Browser app: React + TypeScript
- Backend API: Node.js / FastAPI service layer
- Central database: PostgreSQL + pgvector
- Keyword search: Meilisearch or OpenSearch
- Object storage: S3-compatible storage / local server storage
- Queue system: Redis / BullMQ / Celery
- Document parsing: Apache Tika / Docling / Unstructured
- OCR: Tesseract
- AI runtime: Ollama locally or server-side LLM provider
- Base product candidate: AnythingLLM fork or integration

## Deployment models

### Local personal setup

Server, database, and AI model run on the same machine.

### Small company setup

Client agents run on employee computers. Central server runs on company server/VPS.

### SaaS setup

Central server is hosted by EverythingApp/OmniWare. Clients sync data securely.

## Security requirements

- Client must explicitly select folders to index.
- All sync traffic must be encrypted.
- Tenant separation must be enforced.
- File actions require approval.
- Every file action must be logged.
- Server commands to clients must be signed or authenticated.
