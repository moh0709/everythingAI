# AI Organization Workspace Design

Date: 2026-05-21

## Purpose

This document captures the future EverythingAI workflow where the app continuously watches source folders, indexes and extracts knowledge, then creates an AI-organized copy/archive with enriched metadata.

This is a future product capability, not a replacement for the current local MVP safety model.

## Product concept

EverythingAI should support a managed organization workflow:

```text
Source folders / drives
-> watcher / scanner
-> extraction / indexing
-> AI classification / metadata enrichment
-> previewed organization plan
-> approved copy into organized archive
-> knowledge base / Wiki / Ask layer
-> audit / recovery / rebuild history
```

## Current MVP support

The current MVP already supports the foundation:

```text
folder watching
file scanning
file indexing
text extraction for supported files
search
semantic-style local search
Wiki / source-backed knowledge pages
organization suggestions
safe action previews
approved move/rename execution
undo
recovery snapshots
audit log
```

The current MVP is appropriate for selected safe folders. It is not yet production-ready for unattended full-drive surveillance.

## Future capability

The future workflow should allow users to define:

```text
source folders or drives
watching rules
include/exclude patterns
maximum file sizes
organized archive destination
copy vs move policy
metadata enrichment policy
approval policy
rebuild policy
```

## Core principle

The safest model is:

```text
Source folder = read-only intake
Organized archive = generated copy / managed output
Database = enriched metadata and evidence
Original files = untouched unless the user explicitly chooses move/rename
Actions = preview first, approval before execution
```

## Why copy-first is safer

Copy-first organization avoids destructive changes to original folders.

Benefits:

```text
lower user risk
easier rollback
clearer audit trail
safe experimentation
repeatable archive rebuilds
better trust for early MVP users
```

## Proposed workflow

### 1. Intake configuration

User selects one or more source folders.

Configuration includes:

```text
source path
watch enabled / disabled
recursive scan enabled / disabled
excluded names
excluded extensions
max file size
include hidden files yes/no
full drive mode warning
```

### 2. Knowledge ingestion

The app scans and processes files:

```text
index file metadata
skip unchanged files
extract supported text
extract supported metadata
run OCR/layout extraction in future advanced mode
build searchable content
build Wiki/source pages
```

### 3. AI enrichment

The app enriches files with AI-derived metadata:

```text
summary
classification
topic tags
entities
document type
importance score
sensitivity/risk label
suggested archive path
suggested filename
source evidence references
```

### 4. Organization plan

The app produces a preview-only plan:

```text
copy file to archive path
optional rename in archive
write metadata sidecar
link archive copy to source file
keep source untouched
```

No filesystem mutation happens at this stage.

### 5. User approval

The user reviews:

```text
source file
suggested destination
metadata enrichment
reason / evidence
risk level
conflicts
```

The user can approve one item, selected items, or a batch.

### 6. Archive execution

The app creates the managed archive:

```text
copy original file
write metadata sidecar
record source file fingerprint
record archive file fingerprint
record execution batch
record audit event
record recovery snapshot
```

### 7. Ongoing watch mode

When source files change, the app should:

```text
skip unchanged files
reprocess changed files
mark archive copy stale if needed
suggest archive update
avoid overwriting existing archive files without approval
```

## Metadata sidecar format

Each archived file may receive a sidecar metadata file:

```text
example.pdf
example.pdf.everythingai.json
```

Suggested sidecar fields:

```json
{
  "source_path": "...",
  "archive_path": "...",
  "source_fingerprint": "...",
  "archive_fingerprint": "...",
  "summary": "...",
  "classification": "...",
  "tags": [],
  "entities": [],
  "suggested_by": "EverythingAI",
  "evidence_refs": [],
  "created_at": "...",
  "updated_at": "..."
}
```

## Required backend modules

Proposed future modules:

```text
services/api/src/archive/archivePlanner.js
services/api/src/archive/archiveExecutor.js
services/api/src/archive/archiveRepository.js
services/api/src/archive/metadataSidecar.js
services/api/src/archive/archivePolicy.js
```

## Required database tables

Future schema may include:

```text
archive_profiles
archive_plans
archive_plan_items
archive_executions
archive_metadata
archive_conflicts
archive_rebuilds
```

## Required API routes

Future routes may include:

```text
POST /api/archive/profiles
GET /api/archive/profiles
POST /api/archive/plans
GET /api/archive/plans/:planId
POST /api/archive/plans/:planId/approve
POST /api/archive/plans/:planId/run
GET /api/archive/executions
GET /api/archive/conflicts
```

## UI direction

The UI should expose this as a dedicated workspace:

```text
AI Organization Workspace
```

Recommended screens:

```text
Sources
Rules
Knowledge Ingestion
Organization Plan
Review & Approve
Managed Archive
Activity / Audit
Settings
```

## Safety requirements

Mandatory rules:

```text
copy-first by default
no delete
no overwrite without approval
no archive execution without preview
no full-drive watch without explicit warning
source paths remain traceable
metadata must identify AI-generated fields
user can disable AI metadata enrichment
```

## MVP vs future split

### Current MVP

```text
safe selected-folder indexing
knowledge base
source-backed Wiki
safe preview/approve move/rename
watcher foundation
```

### Future track

```text
managed archive copy workflow
AI metadata sidecars
full organization plan workspace
continuous source-to-archive synchronization
advanced document intelligence for images/tables/charts/layout
```

## PM recommendation

Do not build this as one large refactor.

Build it in stages:

1. Archive design and issue tracking
2. Archive profile model
3. Preview-only archive plan
4. Copy-only archive executor
5. Metadata sidecar writer
6. UI review screen
7. Watcher integration
8. AI enrichment improvements
9. Advanced document intelligence

## Status

Design captured.

Implementation should begin only after the current local MVP finalization tickets are stable and the PM chooses this as the next product track.
