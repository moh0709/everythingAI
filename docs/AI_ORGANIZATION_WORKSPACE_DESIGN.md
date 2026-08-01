# AI Organization Workspace Design

Date: 2026-08-01
Issue: #21

## Purpose

This document captures the future EverythingAI workflow where the app continuously watches source folders, indexes and extracts knowledge, then creates an AI-organized copy/archive with enriched metadata.

This is a future product capability, not a replacement for the current local MVP safety model.

The 2026-08-01 issue #21 pass promotes this document from a concept note into the product-design contract for the future track. Runtime implementation remains stage-gated; this document defines the models, safety invariants, staged work, and review evidence required before any archive execution feature is enabled.

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

## Core principle

The safest model is:

```text
Source folder = read-only intake
Organized archive = generated copy / managed output
Database = enriched metadata and evidence
Original files = untouched unless the user explicitly chooses move/rename
Actions = preview first, approval before execution
```

The product must fail closed when any of these relationships are ambiguous. If a source file, archive file, approval, metadata sidecar, or audit record cannot be linked back to the same plan item and execution batch, the app must mark the item for manual review instead of executing or updating an archive copy.

## Stage-gate contract

The future track is split into independently reviewable stages. Each stage must ship with tests, a report, a handover artifact, and explicit PM acceptance before the next archive stage is released.

| Stage | Scope | Runtime mutation allowed | Required PM gate |
|---|---|---:|---|
| 1 | Product design and issue tracking | No | Design accepted and follow-up tasks scoped |
| 2 | Archive profile model | No | Profile persistence and validation accepted |
| 3 | Preview-only archive plan | No | Planner creates deterministic plans without filesystem writes |
| 4 | Copy-only archive executor | Yes, archive destination only | Copy-first execution and no-overwrite safety accepted |
| 5 | Metadata sidecar writer | Yes, sidecars next to archive copies only | AI-generated fields and evidence provenance accepted |
| 6 | UI review workspace | No direct execution without approval | Review, conflict, approval, and audit visibility accepted |
| 7 | Watcher integration | No archive overwrite by watcher | Stale detection and update-preview flow accepted |
| 8 | AI enrichment improvements | No new filesystem mutation | User-disable switch and provenance labeling accepted |
| 9 | Advanced document intelligence | No broad drive watch by default | OCR/layout/table extraction risk review accepted |

No later stage may use the existence of this design document as evidence that runtime archive behavior is accepted.

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

### Archive profile model

An archive profile is the user-owned configuration that connects source intake to a generated archive.

Required fields:

```json
{
  "id": "archive-profile-id",
  "name": "Family Finance Archive",
  "source_roots": [
    {
      "path": "C:/Users/Moe/Documents",
      "watch_enabled": true,
      "recursive": true,
      "full_drive": false,
      "include_hidden": false,
      "include_patterns": ["**/*"],
      "exclude_patterns": ["**/.git/**", "**/node_modules/**"],
      "max_file_size_bytes": 52428800
    }
  ],
  "archive_destination": "D:/EverythingAI Archive",
  "copy_policy": "copy_first",
  "overwrite_policy": "never_without_explicit_approval",
  "metadata_enrichment_enabled": true,
  "approval_policy": "manual_before_execution",
  "created_at": "2026-08-01T00:00:00.000Z",
  "updated_at": "2026-08-01T00:00:00.000Z"
}
```

Validation rules:

```text
source path and archive destination must be different paths
archive destination must not be inside a watched source root unless explicitly approved
full-drive sources require a warning acknowledgement
copy_policy defaults to copy_first
move_or_rename_originals is disabled unless a later explicit task enables it
metadata_enrichment_enabled can be false without disabling scanner/indexer metadata
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

Plan item contract:

```json
{
  "plan_item_id": "item-id",
  "source_path": "C:/Users/Moe/Documents/invoice.pdf",
  "source_fingerprint": {
    "hash": "sha256:...",
    "size_bytes": 120341,
    "mtime_ms": 1785580800000
  },
  "suggested_archive_path": "D:/EverythingAI Archive/Finance/2026/invoice.pdf",
  "sidecar_path": "D:/EverythingAI Archive/Finance/2026/invoice.pdf.everythingai.json",
  "action": "copy",
  "requires_approval": true,
  "approval_status": "pending",
  "conflict_status": "none",
  "ai_generated_fields": ["summary", "classification", "tags", "suggested_archive_path"],
  "evidence_refs": [
    {
      "type": "extracted_text_span",
      "source_path": "C:/Users/Moe/Documents/invoice.pdf",
      "locator": "page=1"
    }
  ]
}
```

The planner must be deterministic for the same profile, source snapshot, rules, and enrichment inputs. Any non-deterministic AI output must be stored as evidence and reviewed as proposed metadata, not silently treated as user-authored fact.

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

Execution invariants:

```text
only approved plan items may execute
execution reads the source file again immediately before copy
source fingerprint mismatch marks the plan item stale
archive copy uses a non-overwriting create operation by default
destination conflicts pause the item for review
sidecar write happens only after archive copy fingerprint is recorded
audit event records source path, archive path, plan id, batch id, and approval id
recovery snapshot can remove generated archive outputs only if later approved by recovery tooling
```

The executor must never delete source files. It must not overwrite archive files unless the user approves a specific conflict resolution for that exact plan item and destination fingerprint.

### 7. Ongoing watch mode

When source files change, the app should:

```text
skip unchanged files
reprocess changed files
mark archive copy stale if needed
suggest archive update
avoid overwriting existing archive files without approval
```

Stale detection states:

| State | Meaning | Allowed next action |
|---|---|---|
| `current` | Source and archive fingerprints match the approved execution record | None |
| `source_changed` | Source fingerprint differs from last archived source fingerprint | Generate update preview |
| `archive_missing` | Archive copy no longer exists | Generate rebuild preview |
| `archive_changed` | Archive fingerprint differs from EverythingAI output record | Manual review |
| `sidecar_missing` | Metadata sidecar is absent | Regenerate sidecar preview |
| `conflict` | Destination path is occupied by an unexpected file | Manual conflict resolution |

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
  "source_fingerprint": {
    "hash": "sha256:...",
    "size_bytes": 0,
    "mtime_ms": 0
  },
  "archive_fingerprint": {
    "hash": "sha256:...",
    "size_bytes": 0,
    "mtime_ms": 0
  },
  "metadata": {
    "summary": {
      "value": "...",
      "generated_by": "EverythingAI",
      "ai_generated": true,
      "evidence_refs": []
    },
    "classification": {
      "value": "...",
      "generated_by": "EverythingAI",
      "ai_generated": true,
      "evidence_refs": []
    },
    "tags": {
      "value": [],
      "generated_by": "EverythingAI",
      "ai_generated": true,
      "evidence_refs": []
    }
  },
  "approval": {
    "approved_by": "user-or-operator-id",
    "approved_at": "...",
    "plan_id": "...",
    "plan_item_id": "...",
    "execution_batch_id": "..."
  },
  "created_at": "...",
  "updated_at": "..."
}
```

Sidecar rules:

```text
sidecar filename is archive filename plus .everythingai.json
AI-generated fields must be identified field-by-field
user-edited fields must replace or supplement generated values with provenance
sidecar write must be atomic where the filesystem supports atomic replace
sidecar content must never include API keys, credentials, bearer tokens, cookies, or raw secret-bearing URLs
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

Module responsibilities:

| Module | Responsibility |
|---|---|
| `archivePolicy.js` | Validate profile settings, full-drive warnings, copy-first defaults, overwrite policy, and AI enrichment toggle |
| `archivePlanner.js` | Build preview-only plan items from source snapshots, rules, knowledge metadata, and AI enrichment outputs |
| `archiveExecutor.js` | Execute approved copy-first plan items with source/archive fingerprint verification |
| `metadataSidecar.js` | Build and write sidecars with AI provenance and approval metadata |
| `archiveRepository.js` | Persist profiles, plans, approvals, executions, conflicts, stale states, and audit links |

## Required database tables

Future schema may include:

```text
archive_profiles
archive_plans
archive_plan_items
archive_approvals
archive_executions
archive_metadata
archive_conflicts
archive_rebuilds
```

Minimum table intent:

| Table | Intent |
|---|---|
| `archive_profiles` | User configuration for sources, destination, rules, and enrichment policy |
| `archive_plans` | Immutable preview snapshots generated from a profile and source state |
| `archive_plan_items` | Per-file proposed copy, sidecar, metadata, conflict, and approval state |
| `archive_approvals` | User approvals bound to exact plan item revisions |
| `archive_executions` | Execution batches and per-item copy/sidecar outcomes |
| `archive_metadata` | Searchable metadata and AI provenance indexed from sidecars |
| `archive_conflicts` | Destination collisions, fingerprint mismatches, and manual-resolution records |
| `archive_rebuilds` | Stale detection, rebuild previews, and archive refresh history |

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

Review workspace requirements:

```text
source and archive previews are shown side by side when supported
plan items are filterable by pending, approved, conflict, stale, and executed
AI-generated metadata is visually distinct from user-authored metadata
bulk approval shows an item count and conflict count before confirmation
full-drive watch configuration requires an explicit warning acknowledgement
execution status links to audit, recovery, source fingerprint, and archive fingerprint evidence
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

Safety acceptance matrix:

| Issue #21 criterion | Required future evidence | Stage |
|---|---|---|
| User can configure a source folder and archive destination | Archive profile model validation, API tests, UI configuration test | 2, 6 |
| App can generate a preview-only organization plan | Planner tests proving no filesystem writes | 3 |
| App can copy approved files into an organized archive without modifying originals | Executor tests with source fingerprint before/after and archive copy proof | 4 |
| App writes metadata sidecars for archive files | Sidecar schema tests and archive destination file proof | 5 |
| App records source and archive fingerprints | Repository and executor tests for persisted fingerprints | 4 |
| App detects stale archive copies when source files change | Watcher integration tests for stale states | 7 |
| App keeps full audit/recovery trace | Audit/recovery integration tests linked to execution batches | 4, 6, 7 |
| App never deletes or overwrites without explicit approval | Policy, executor, and conflict tests proving fail-closed behavior | 2, 4, 7 |

Current issue #21 completion status: product-design contract only. Runtime acceptance criteria above are mapped to required future stages and must not be marked implemented until their stage-specific tasks are released, coded, validated, and accepted.

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

Recommended follow-up issues:

```text
AI Organization Workspace Stage 2: Archive profile model and policy validation
AI Organization Workspace Stage 3: Preview-only archive planner
AI Organization Workspace Stage 4: Copy-first archive executor
AI Organization Workspace Stage 5: Metadata sidecar writer
AI Organization Workspace Stage 6: UI review workspace
AI Organization Workspace Stage 7: Watcher stale detection integration
AI Organization Workspace Stage 8: AI metadata enrichment controls
AI Organization Workspace Stage 9: Advanced document intelligence research spike
```

Each follow-up should be dependency-gated and released separately. None should be auto-released from this issue.

## Status

Design captured and expanded into a stage-gated product-design contract for issue #21.

Implementation should begin only after the current local MVP finalization tickets are stable and the PM chooses this as the next product track.
