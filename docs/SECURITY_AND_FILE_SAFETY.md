# SECURITY AND FILE SAFETY

## Core principle

EverythingApp must never perform destructive file operations without explicit user approval.

## Safety rules

1. All actions must be previewed before execution.
2. All actions must be logged.
3. All actions must be reversible where possible.
4. Delete actions require double confirmation.
5. Bulk actions must show grouped preview.

## Undo system

Before executing any action, store:

- original path
- original filename
- timestamp
- action id

This allows full rollback.

## Risk levels

- Low: tagging, categorization
- Medium: rename, move
- High: delete

## Permission model (future)

- Admin
- Editor
- Viewer

## Local-first security

- No data leaves the system unless explicitly configured.
- Support local LLMs.
