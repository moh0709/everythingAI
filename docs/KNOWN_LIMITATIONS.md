# KNOWN LIMITATIONS

## Purpose

This document lists the known limitations of the current EverythingAI local MVP.

These limitations are acceptable for the local MVP but must be addressed before a production platform release.

## 1. Local-only architecture

The current MVP runs on one machine.

It does not yet include:

- central server deployment
- remote client agents
- cross-device sync
- multi-user collaboration

## 2. SQLite database

The MVP uses SQLite.

SQLite is good for a local prototype, but production needs:

- PostgreSQL
- migrations
- tenant isolation
- backup strategy
- pgvector or external vector database

## 3. Deterministic local embeddings

The current vector-style search uses deterministic token hashing.

It is useful for MVP related-content search but is not equivalent to real neural embeddings.

Production should add:

- Ollama embeddings
- nomic-embed-text or BGE
- chunk-level embeddings
- pgvector/Qdrant/Weaviate support

## 4. File execution is local API based

The local MVP can execute approved move/rename actions because the API runs on the same machine as the files.

The future central platform must not do this directly.

Production must use:

```text
Browser approval → server command queue → installed client agent → local execution → result report → audit log
```

## 5. Delete actions are not implemented

This is intentional.

Delete actions should remain disabled until the safety model is much stronger.

## 6. Watcher is still MVP-level

The watcher now has debounce and queued execution, but it still needs more real-world testing.

Known risks:

- large folders can trigger heavy rescans
- network drives may behave differently
- Windows filesystem events can be noisy
- simultaneous changes may still require tuning

## 7. Scanner optimization is not complete

The scanner supports max file size and excludes, but it does not yet persist a full unchanged-file state cache optimized for very large drives.

## 8. Extraction is basic

Supported first-pass types:

- txt
- md
- csv
- pdf
- docx
- xlsx

Extraction can fail on corrupted, encrypted, scanned-image, or malformed documents.

OCR is not implemented yet.

## 9. Security is local-development level

The API uses a bearer token suitable for local testing.

Production needs:

- real authentication
- user sessions or JWT
- device identity
- secure token rotation
- role-based permissions
- audit immutability

## 10. UI is prototype-level

The browser UI is functional but not production-grade.

Missing:

- loading states
- improved error handling
- better action confirmation UX
- richer file preview
- role-based views
- polished design system

## 11. AnythingLLM integration is optional sync only

The current integration can upload extracted knowledge to AnythingLLM.

It is not yet a deep AnythingLLM fork or full bidirectional integration.

## 12. No installer yet

The MVP must be run manually with Node.js.

A production local app will need:

- Windows installer
- background service option
- auto-start option
- tray app or desktop shell
- signed executable

## 13. No enterprise permission model yet

There is no tenant/user/workspace/device permission model in the local MVP.

This belongs to the production-platform phase.

## Final note

The current MVP should be judged as a local proof-of-value system, not yet a production platform.

The goal is to finalize it until it is stable, safe, and useful locally before scaling the architecture.
