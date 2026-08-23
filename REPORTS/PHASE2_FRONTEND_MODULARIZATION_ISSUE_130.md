# Phase 2 Milestone 5 — Controlled Frontend Modularization

Issue: #130  
Baseline: `f4de9b2c890ad28503756742e0989ac1bd2d01d2`

## Scope decision

The highest-risk coupling found in the Phase 2 Product Intelligence surfaces was the security-sensitive remote-provider API-key lifecycle state machine embedded directly inside the generic provider configuration component.

That block combined saved-secret detection, replacement mode, clear staging, confirmation, copy, input masking, and visual state while the parent component also owned endpoint/model/temperature/max-token configuration. This made future provider UI edits unnecessarily likely to touch credential lifecycle behavior.

## Implementation

Extracted the API-key lifecycle into:

`apps/everything-ai-ui/src/admin/components/ProviderApiKeyLifecycleField.tsx`

The parent:

`apps/everything-ai-ui/src/admin/components/ProviderConfigurationPanel.tsx`

now delegates only the credential lifecycle field while retaining the same provider settings contract and generic remote-provider controls.

## Preserved semantics

- `__saved__` remains the saved-secret sentinel.
- Saved keys remain masked and disabled until explicit replacement mode.
- Replacement, cancellation, keep-saved-key, and clear staging behavior are unchanged.
- Clear still requires explicit browser confirmation.
- Staged changes are still persisted only through the existing Save AI Settings workflow.
- No provider runtime, persistence, backend, source attribution, user/admin boundary, planning, citation, or knowledge behavior changed.

## Validation gate

Before acceptance require the complete inherited matrix:

- root regression;
- backend tests;
- frontend typecheck/build;
- Client/Admin smoke;
- Phase 2 rich-citation acceptance;
- Phase 2 document-formatting acceptance;
- Phase 2 grouped-planning acceptance;
- Phase 2 API-key lifecycle acceptance;
- disposable-folder RC acceptance;
- UI-governed action/undo acceptance;
- independent diff review with no unresolved Critical/Important findings.

## Rollback

Revert the eventual #130 merge commit. The extraction introduces no schema or persistence migration and can be rolled back independently.

## Scope boundaries

No authentication, tenancy, cloud deployment, database migration, object storage, connector expansion, or protected issue #69 changes are part of this milestone.
