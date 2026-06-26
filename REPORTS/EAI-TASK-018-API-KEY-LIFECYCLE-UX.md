# EAI-TASK-018 — Improve Admin API key lifecycle UX

## Result

**Final status:** PASS

## Repository / environment

- **Repository path used:** `/root/.hermes/projects/everythingAI`
- **Current branch:** `main`
- **Starting commit SHA:** `bc2a0e62dcb7b129b5f5e45a8c38d8ad21e6ae2a`
- **Pre-commit artifact SHA placeholder:** `PENDING_COMMIT_SHA`
- **Artifact commit SHA:** `e835326`
- **Final SHA source of truth:** `GitHub issue comment after artifact push`

## Files changed

- `LOGS/EAI-TASK-018-terminal.log`
- `REPORTS/EAI-TASK-018-API-KEY-LIFECYCLE-UX.md`
- `docs/HANDOVER_2026-06-25_EAI_TASK_018_API_KEY_LIFECYCLE_UX.json`

## UX behavior implemented

- Saved remote API keys remain masked through the `__saved__` preservation flow.
- The admin provider UI distinguishes `not configured`, `saved`, `being replaced`, and `being cleared` states.
- Saved-key status is shown with explicit pills and guidance text.
- Operators can keep the saved key, clear it intentionally, or stage a replacement key before saving.
- The connection test action remains separate from save behavior and still tests the last saved provider config.
- Client Workspace API-key controls are not exposed by this admin-only settings view.

## Backend behavior preserved

- `services/api/src/routes/providerSettings.routes.js` still masks stored remote API keys as `__saved__` in public responses.
- `preserveSavedKeys()` still restores saved keys when the draft submits `__saved__`.
- Empty-string clearing remains an intentional action through the clear-key flow.
- Provider connection tests still operate through the existing provider settings test route.
- Admin-only provider settings boundaries remain intact.

## Validation summary

- Git pull: PASS (`Already up to date.`)
- Framework doctor: PASS
- UI typecheck: PASS
- UI build: PASS
- API tests: PASS

## Risks and rollback

- Risk: the admin provider key UX relies on the existing `__saved__` sentinel and the clear/replace controls staying consistent.
- Mitigation: validation passed, and the backend masking/preservation logic was reviewed alongside the UI behavior.
- Rollback: revert the artifact commit once it is created, or revert any future UI refinement that changes the provider key control flow.

## Recommended next task

- Review the next ready admin-maintenance issue, likely the remaining admin navigation cleanup work, since the provider key lifecycle UX is now documented and validated.

## Lifecycle notes

- No production code changes were required for this task; the active UI already implements the requested saved/replace/clear distinction.
- Issue comment will record the final PASS status, validation summary, files changed, and artifact commit SHA.
- Labels to finish: `hermes:working -> pm:review + hermes:done`.
- Final SHA handling: this report records the initial artifact commit SHA `e835326`; the GitHub issue comment will record the final synchronized metadata commit SHA after push.
