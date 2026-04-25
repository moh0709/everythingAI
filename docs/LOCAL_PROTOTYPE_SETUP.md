# LOCAL PROTOTYPE SETUP

## Prototype target

The first prototype will run fully on a local Windows machine.

```text
Windows PC
  ├─ Central API
  ├─ PostgreSQL database
  ├─ Client agent
  └─ Browser access through localhost
```

## Goal

The prototype is ready when this works:

```text
Start API
→ Start PostgreSQL
→ Start client agent
→ Client scans a folder
→ Metadata is saved permanently
→ Browser/API can list and search indexed files
```

## Required software

Install these before implementation starts:

### 1. Git

Required for cloning and committing to the repository.

Check:

```powershell
git --version
```

### 2. Node.js LTS

Recommended: Node.js 20 LTS or newer.

Check:

```powershell
node -v
npm -v
```

### 3. Docker Desktop

Required for easy local PostgreSQL and future Meilisearch/worker services.

Check:

```powershell
docker --version
docker compose version
```

### 4. VS Code

Recommended editor.

Useful extensions:

- GitHub Pull Requests
- Prisma
- Docker
- ESLint

### 5. PostgreSQL client tools

Optional but useful.

Recommended tools:

- pgAdmin
- DBeaver
- TablePlus

## Recommended local folders

Clone the repo into:

```text
C:\AI\everythingAI
```

Create a safe test folder for indexing:

```text
C:\AI\everythingAI-test-files
```

Do not test first scan against the whole drive.

## Test files

Add a few safe test files:

```text
C:\AI\everythingAI-test-files\invoice-test.txt
C:\AI\everythingAI-test-files\contract-test.txt
C:\AI\everythingAI-test-files\notes-test.md
```

## First prototype environment

API:

```text
http://localhost:4100
```

Client agent scan path:

```text
C:\AI\everythingAI-test-files
```

## First implementation tasks

### Step 1

Add root `.gitignore`.

### Step 2

Add root setup instructions.

### Step 3

Add Docker Compose for PostgreSQL.

### Step 4

Add Prisma to `services/api`.

### Step 5

Create database schema for:

- tenants
- users
- devices
- files
- scan sessions
- audit events

### Step 6

Replace in-memory API storage with PostgreSQL.

### Step 7

Add stable client device identity.

### Step 8

Add batching and exclude rules in client agent.

## Important safety rules for local prototype

- Do not scan entire `C:\` drive initially.
- Do not scan system folders.
- Do not scan `node_modules`.
- Do not scan `.git` folders.
- Do not enable move/rename/delete actions yet.

## Current prototype limitation

The current code stores API data in memory only. The next implementation step must add persistent PostgreSQL storage.
