# Issue #21 - AI Organization Workspace Design

## Summary

Issue #21 was handled as a future-track product-design task, not as a runtime archive implementation.

The existing design document was expanded into a stage-gated contract covering archive profiles, preview-only plans, copy-first execution, metadata sidecars, source/archive fingerprints, conflicts, approvals, watcher stale detection, UI review requirements, and future advanced document intelligence.

## Scope decision

The issue is labeled `future-track` and `product-design`. The issue body says the workflow is not a replacement for the current local MVP safety model and should remain separate from current MVP finalization work.

For that reason, this pass does not add archive runtime code, database migrations, API routes, UI screens, or filesystem execution behavior. It defines the required future implementation stages and evidence gates so the feature can be built safely in smaller accepted tasks.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| User can configure a source folder and archive destination | Deferred to Stage 2 and Stage 6 | `docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md` now defines the archive profile model, validation rules, and UI review workspace requirements. |
| App can generate a preview-only organization plan | Deferred to Stage 3 | The design now defines the plan item contract and deterministic preview-only planner requirement. |
| App can copy approved files into an organized archive without modifying originals | Deferred to Stage 4 | The design now defines copy-first executor invariants, source re-fingerprinting, and no source deletion. |
| App writes metadata sidecars for archive files | Deferred to Stage 5 | The design now defines sidecar filename, schema, AI provenance, approval metadata, and secret-redaction rules. |
| App records source and archive fingerprints | Deferred to Stage 4 | The design now defines source/archive fingerprint fields and persistence requirements. |
| App detects stale archive copies when source files change | Deferred to Stage 7 | The design now defines stale detection states and allowed next actions. |
| App keeps full audit/recovery trace | Deferred to Stage 4, Stage 6, and Stage 7 | The design now requires audit/recovery links for plan, approval, execution, source fingerprint, and archive fingerprint evidence. |
| App never deletes or overwrites without explicit approval | Product safety rule captured; runtime proof deferred | The design now requires no delete, no overwrite without exact approval, fail-closed conflict handling, and stage-specific policy/executor tests. |

## Risk review

| Risk | Control added in design |
|---|---|
| Data loss from AI organization | Source folders are read-only intake; archive is generated output; executor must never delete source files. |
| Silent overwrite | Archive writes use no-overwrite behavior by default and conflict resolution requires item-specific approval. |
| Unreviewed AI metadata | AI-generated fields must be identified field-by-field and can be disabled by the user. |
| Full-drive surveillance | Full-drive sources require explicit warning acknowledgement. |
| Stale archive copies | Watcher integration must mark stale states and generate previews instead of overwriting. |
| Evidence mismatch | Plan, approval, execution, sidecar, source fingerprint, archive fingerprint, audit, and recovery records must link to the same item and batch. |
| Scope creep | Runtime implementation is split into dependency-gated follow-up stages. |

## Artifacts changed

```text
docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md
REPORTS/ISSUE-21-AI-ORGANIZATION-WORKSPACE-DESIGN.md
docs/HANDOVER_2026-08-01_ISSUE_21_AI_ORGANIZATION_WORKSPACE_DESIGN.json
.hermes/state.json
```

## Validation

Required validation before submission:

```text
npm run framework:doctor
node --test tests/*.test.mjs
npm test
git diff --check
node JSON parse check for handover and .hermes/state.json
```

## PM review recommendation

Accept issue #21 as Stage 1 product-design and issue-tracking completion only if PM agrees that runtime acceptance criteria are intentionally mapped to future dependency-gated tasks.

Do not close the issue from the execution side. Do not treat this pass as PM acceptance. Do not release later archive stages until PM explicitly accepts this submission and creates/releases the next task.
