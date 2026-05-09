# Internal File Ecosystem

## Purpose

EverythingAI must maintain its own governed internal knowledge ecosystem. The system should not only point to external files; it should track every file as a governed cognitive asset with metadata, source mode, extracted intelligence, recovery state, audit lineage, and searchability.

## Source modes

Every file must have a clear source-of-truth state.

| Mode | Meaning | MVP status |
|---|---|---|
| Reference Mode | Original remains external. Platform indexes metadata/content only. | Enabled |
| Copy Mode | Platform copies file into internal ecosystem. Original remains untouched. | Enabled |
| Managed Mode | Platform moves file internally and becomes source of truth. | Disabled by default |

MVP should start with Reference Mode and Copy Mode. Managed Mode should be introduced only after recovery, governance, retention, and execution sandboxing are mature.

## Internal storage layout

Recommended object layout:

```text
tenant/
  workspace/
    raw/
      files/
      imports/
    extracted/
      text/
      metadata/
      ocr/
    normalized/
      ciif/
    embeddings/
      manifests/
    graph/
      relationships/
      topology/
    snapshots/
      recovery/
      execution/
    trash/
      pending_purge/
    audit/
      events/
      replay/
```

## File registry

Every file must be registered in a canonical registry.

```json
{
  "file_id": "tenant-file-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "source_mode": "reference | copy | managed",
  "source_of_truth": "external | internal",
  "original_location": "external/path/or/url",
  "internal_location": "tenant/workspace/raw/files/...",
  "filename": "LT1_Blower_Manual.pdf",
  "mime_type": "application/pdf",
  "checksum": "sha256",
  "status": "active | trash | purged | archived",
  "retention_until": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## File lifecycle

Normal lifecycle:

```text
DISCOVERED
  -> REGISTERED
  -> INGESTED
  -> EXTRACTED
  -> NORMALIZED
  -> INDEXED
  -> SEARCHABLE
  -> ORGANIZED
  -> ACTIVE
```

Deletion lifecycle:

```text
ACTIVE
  -> MARKED_FOR_DELETION
  -> MOVED_TO_TRASH
  -> RETENTION_PERIOD
  -> PURGE_ELIGIBLE
  -> PURGED
```

Restore lifecycle:

```text
TRASH
  -> RESTORE_REQUESTED
  -> RESTORE_VALIDATED
  -> RESTORED
  -> ACTIVE
```

## Trashbin retention

Default:

```text
trash_retention_days = 30
```

Admin settings:

| Setting | Default |
|---|---|
| Trash retention days | 30 |
| Allow user restore | yes |
| Require admin approval for purge | yes |
| Preserve audit after purge | yes |
| Preserve replay metadata after purge | yes |
| Auto purge after retention | yes |
| Minimum retention days | 7 |

Permanent purge removes file content, not governance history. Audit, replay, lineage, and governance metadata should remain.

## AI authority boundaries

AI may initially:

```text
classify files
suggest organization
detect duplicates
recommend canonical versions
create tickets
simulate moves
```

AI may not initially:

```text
permanently purge files
move original external files
override retention
change source-of-truth mode
bypass approvals
```

## File operation events

Important file lifecycle events:

```text
file.discovered
file.registered
file.ingested
file.extracted
file.normalized
file.indexed
file.classified
file.moved_to_trash
file.restored
file.purge_requested
file.purged
```

## Implementation targets

```text
packages/files/fileRegistry.ts
packages/files/sourceModes.ts
packages/files/fileLifecycle.ts
packages/files/retentionPolicy.ts

services/ingestion/src/fileRegistryService.ts
services/ingestion/src/sourceModeService.ts
services/recovery/src/trashbinService.ts
services/recovery/src/retentionScheduler.ts
services/recovery/src/restoreService.ts

apps/api/src/files/files.controller.ts
apps/api/src/recovery/recovery.controller.ts
apps/web/src/admin/SourceModeSettings.tsx
```

## Launch blockers

Do not launch without:

- Source mode tracking
- Original and internal location tracking
- Trashbin state
- 30-day default retention
- Restore capability
- Audit and replay event creation
