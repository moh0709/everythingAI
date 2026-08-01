# Issue #3 - Local MVP finalization maintenance

## Status

SUBMITTED_FOR_PM_REVIEW

## Scope

Focused backend maintenance for the open local MVP finalization umbrella. The latest PM comment identifies backend/runtime optimization as the preferred next area, and `docs/MVP_FINALIZATION_PLAN.md` had one remaining backend embedding item: future provider interface for real neural embeddings.

## Implementation

- Added canonical async embedding provider compatibility while preserving the deterministic local MVP provider as the default.
- Added `generateEmbeddingsAsync` for future neural providers using `embedBatch`/`embedText` style adapters.
- Preserved unchanged extracted-text skip behavior for async providers to avoid unnecessary re-embedding.
- Added regression coverage proving async provider batches run once, persist vectors, and skip unchanged text on repeat generation.
- Updated `docs/MVP_FINALIZATION_PLAN.md` to mark the backend provider-interface item complete.

## Acceptance Matrix

| Criterion | Evidence | Status |
|---|---|---|
| Run full backend `npm test` locally | `cd services/api; npm test` -> 173/173 pass | PASS |
| Preserve current deterministic local MVP embeddings | Existing embedding/search tests plus unchanged default provider path | PASS |
| Prepare interface for future real embedding provider | `generateEmbeddingsAsync` supports canonical async `embedBatch` providers | PASS |
| Avoid regenerating embeddings for unchanged extracted text | New async provider regression and existing sync skip regression | PASS |
| Keep scope to current local MVP backend | Changed files are limited to `services/api` embedding code/tests plus evidence docs | PASS |

## Validation

```text
cd C:\temp\EverythingAI\services\api
npm test
Result: 173/173 passed

cd C:\temp\EverythingAI
npm test
Result: 182/182 passed
```

## Risk Review

- Data loss: no filesystem action code changed.
- Secret exposure: no secrets read or recorded.
- Production-platform scope creep: no PostgreSQL, vector DB, SaaS, installer, or multi-tenant changes added.
- Existing user changes: preserved unrelated modified/untracked files.

## Known Limitations

- Async embedding generation is an integration-ready backend API; no provider settings UI or remote provider policy wiring was added in this issue.
- Storage remains MVP SQLite `file_embeddings` file-level vectors, not chunk-level vector storage.
