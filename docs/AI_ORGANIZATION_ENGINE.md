# AI ORGANIZATION ENGINE

## Safety mode decision

EverythingApp will use the following default workflow:

```text
Suggest → Preview → Approve → Execute
```

The AI must not silently move, rename, delete, or reorganize files without user approval in the initial product versions.

## Purpose

The AI Organization Engine is the core differentiator of EverythingApp. It uses filenames, paths, metadata, extracted content, and user-defined rules to suggest better organization of files.

## Inputs

- Filename
- Current path
- File extension
- File metadata
- Extracted text
- Document summary
- Detected entities
- User-defined folder rules
- Historical user approvals

## Outputs

The engine can suggest:

- Better filename
- Better folder location
- Tags
- Category
- Archive status
- Duplicate handling
- Related documents
- Knowledge page links

## Required confidence levels

Every suggestion must include a confidence score:

```text
High confidence: safe suggestion, likely correct
Medium confidence: useful but should be reviewed carefully
Low confidence: show as weak suggestion only
```

## Action proposal format

Each proposed action should be stored as a structured object:

```json
{
  "action_type": "move_file",
  "source_path": "C:/Users/Moe/Downloads/invoice.pdf",
  "target_path": "C:/Documents/Finance/Invoices/2026/invoice.pdf",
  "reason": "The document appears to be an invoice from 2026.",
  "confidence": 0.91,
  "requires_approval": true
}
```

## Approval rules

- All file moves require approval.
- All renames require approval.
- All deletes require approval and extra confirmation.
- Bulk actions require batch preview.
- Undo metadata must be created before execution.

## Future automation mode

A later version may support automatic organization under strict user-defined rules, for example:

```text
If confidence > 0.95 and file type is invoice and folder rule exists, allow auto-move.
```

This must remain disabled by default.
