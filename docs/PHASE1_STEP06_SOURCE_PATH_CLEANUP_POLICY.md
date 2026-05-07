# Phase 1 — Step 1.6 Source Path Remove/Cleanup Policy

## Status

```text
COMPLETE
```

## Objective

Define the safe source path removal and cleanup policy for EverythingAI.

This step clarifies what should happen when a user removes a source path from EverythingAI.

---

# Current Runtime Behavior

The current runtime behavior is already conservative and safe.

When a source path is deleted through:

```text
DELETE /api/source-paths
```

The system currently:

```text
1. stops the watcher for the folder
2. deletes the watch root/source path record
3. returns the remaining source paths
```

It does NOT currently delete:

```text
- indexed file records
- extracted text records
- embeddings
- insights
- labels/categories
- suggestions
- previews
- executions
- audit history
```

This is the safest behavior for Phase 1.

---

# Approved Phase 1 Policy

## Safe default policy

```text
Removing a source path removes it from active scope only.
```

It should not silently delete knowledge or history.

---

# Why This Is the Correct Phase 1 Policy

Deleting a source path can mean several different things:

```text
A. Stop watching the folder only
B. Mark related indexed files as removed_from_scope
C. Delete indexed file metadata
D. Delete extracted content
E. Delete embeddings
F. Delete insights/knowledge
G. Delete suggestions/previews/executions
H. Delete audit history
```

These are different product behaviors.

Silently choosing aggressive deletion would be unsafe.

Therefore Phase 1 uses the conservative behavior:

```text
Stop tracking the source path.
Preserve indexed knowledge and audit history.
```

---

# Phase 1 Runtime Decision

## Runtime code change required?

```text
NO
```

The current runtime already follows the safe Phase 1 behavior.

## Runtime behavior to preserve

```text
stop watcher
remove watch root
preserve indexed knowledge
preserve history
```

---

# Future Cleanup Modes

Later phases may introduce explicit cleanup modes.

Recommended future modes:

## Mode 1 — Remove Source Only

```text
remove_source_only
```

Behavior:

```text
- stop watcher
- remove source path record
- keep indexed knowledge
- keep history
```

This is the current Phase 1 behavior.

---

## Mode 2 — Mark Files Removed From Scope

```text
mark_removed_from_scope
```

Behavior:

```text
- stop watcher
- remove source path record
- mark related indexed files as removed_from_scope
- keep extracted text
- keep embeddings
- keep history
```

This requires future file/sourceRoot relationship improvements.

---

## Mode 3 — Remove Indexed Knowledge

```text
remove_indexed_knowledge
```

Behavior:

```text
- stop watcher
- remove source path record
- delete indexed file records
- delete extracted text
- delete embeddings
- delete insights
- keep audit history
```

This should require explicit user confirmation.

---

## Mode 4 — Full Purge

```text
full_purge
```

Behavior:

```text
- stop watcher
- remove source path record
- delete indexed knowledge
- delete derived records
- delete suggestions/previews if safe
- preserve minimum audit record only
```

This should require strong explicit confirmation and is not recommended for early MVP.

---

# Required Future Preconditions Before Aggressive Cleanup

Aggressive cleanup should not be implemented until the system has:

```text
- stable sourceRootId on files
- planning sessions
- lifecycle events
- audit rules
- source path cleanup confirmation UI
- backup/export strategy
- diagnostics visibility
```

Without these, aggressive cleanup risks data loss or broken references.

---

# Source Path Cleanup and File Identity

Phase 0 established:

```text
path is metadata, not identity
```

Future cleanup should rely on:

```text
sourceRootId
fileId
contentHash
```

not only absolute paths.

The current MVP does not yet have complete sourceRootId linkage across all indexed files, so Phase 1 should not implement aggressive cleanup.

---

# Source Path Cleanup and Planning

If a source path is removed, future planning sessions may need to know:

```text
- whether the files are still physically available
- whether the source root is still active
- whether previews are invalidated
```

This belongs to later planning/invalidation phases.

Phase 1 should not introduce complex planning invalidation yet.

---

# Source Path Cleanup and Search

Preserved indexed knowledge may still appear in search after the source path is removed.

This is acceptable in Phase 1 because:

```text
- the knowledge was previously consumed
- no silent data deletion occurs
- user can still benefit from indexed knowledge
```

Future UI should clearly indicate whether a source is active, removed, or stale.

---

# Recommendation

Phase 1 should keep the current safe behavior:

```text
DELETE /api/source-paths
  ↓
stop watcher
remove watch root
preserve indexed knowledge
```

No runtime code change is needed for Step 1.6.

---

# Step 1.6 Due Diligence

## Architecture consistency

```text
PASS
```

The policy follows Phase 0 file identity and source path rules.

## Filesystem safety

```text
PASS
```

No files are deleted or modified.

## Knowledge safety

```text
PASS
```

No indexed knowledge is silently deleted.

## Future compatibility

```text
PASS
```

The policy leaves room for future explicit cleanup modes.

## Runtime regression risk

```text
LOW
```

No runtime code change is required.

---

# Result

```text
Step 1.6 passes due diligence.
```

The project can proceed to:

```text
Step 1.7 — Add Regression Tests for Ingestion/Planning Separation
```
