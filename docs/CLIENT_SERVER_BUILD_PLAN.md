# CLIENT-SERVER BUILD PLAN

## Build direction

EverythingApp will be built as a centralized platform with local client agents.

This means the first build should not be a standalone local-only desktop app.

The first build should include:

```text
Client Agent → Central API → Central Database → Browser UI
```

## System roles

### 1. Client Agent

Runs on the user's computer.

Responsibilities:

- Scan selected folders
- Watch for file changes
- Calculate file hashes
- Extract basic metadata
- Send metadata to server
- Optionally upload extracted text or full documents
- Receive approved action commands
- Execute approved local file actions
- Report execution results

### 2. Central Server

Runs on VPS, company server, or SaaS infrastructure.

Responsibilities:

- Authentication
- Tenant/company management
- Device/client registration
- Metadata ingestion
- Document processing queue
- Search index updates
- AI/RAG handling
- Action proposal management
- Approval workflow
- Audit logging

### 3. Browser UI

Runs in the browser.

Responsibilities:

- Search files and knowledge
- Chat with indexed data
- Review AI suggestions
- Approve/reject proposed file actions
- Manage folders, clients, users, and settings

### 4. Desktop UI

Can be part of the client agent or a separate Tauri app.

Responsibilities:

- Local setup
- Folder permission selection
- Sync status
- Local logs
- Client connection status

## MVP build order

### Step 1 — Central API skeleton

Create backend API with:

- health endpoint
- authentication placeholder
- device registration endpoint
- file metadata ingestion endpoint
- file listing endpoint

### Step 2 — Database schema

Create central database schema for:

- tenants
- users
- devices
- indexed files
- file chunks
- embeddings
- action proposals
- audit logs

### Step 3 — Client agent prototype

Create a local client agent that:

- scans one selected folder
- calculates file metadata
- posts metadata to server

### Step 4 — Browser dashboard prototype

Create UI to:

- list connected devices
- list indexed files
- search metadata

### Step 5 — Content extraction

Add extraction pipeline for:

- PDF
- DOCX
- TXT
- MD
- CSV
- XLSX

### Step 6 — AI integration

Add:

- embeddings
- semantic search
- AI chat
- source references

### Step 7 — Organization engine

Add:

- file category suggestions
- rename suggestions
- folder suggestions
- preview approval workflow

### Step 8 — Safe file execution

Add:

- server command queue
- client command polling or websocket
- approved move/rename execution
- result reporting
- undo records

## Recommended first repository folders

```text
/apps
  /web
  /client-agent
  /desktop

/services
  /api
  /worker
  /ai

/packages
  /shared
  /types
  /config

/docs
  /architecture
  /product
  /decisions

/infra
  /docker
  /database
```

## First implementation priority

The first real implementation should be:

```text
Central API + Database + Client Agent metadata sync
```

This gives the product a real foundation before deep AI integration.
