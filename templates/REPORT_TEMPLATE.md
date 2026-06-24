# {{TASK_ID}} — {{TITLE}}

## Result

**Final status:** {{STATUS}}

## Repository / environment

- **Repository path used:** `{{REPO_PATH}}`
- **Current branch:** `{{BRANCH}}`
- **Starting commit SHA:** `{{START_SHA}}`
- **Pre-commit artifact SHA placeholder:** `{{PRE_COMMIT_ARTIFACT_SHA}}`
- **Artifact commit SHA:** `{{ARTIFACT_SHA}}`
- **Final SHA source of truth:** `{{FINAL_SHA_SOURCE}}`

## Files changed

- {{FILES_CHANGED}}

## Validation summary

- Dry run: {{DRY_RUN}}
- Framework doctor: {{FRAMEWORK_DOCTOR}}
- UI typecheck: {{UI_TYPECHECK}}
- UI build: {{UI_BUILD}}
- API tests: {{API_TESTS}}

## Lifecycle notes

- Issue comment: {{ISSUE_COMMENT}}
- Labels updated: {{LABELS}}
- Final SHA handling: {{FINAL_SHA_HANDLING}}

## Skipped commands / reasons

- {{SKIPS}}

## Follow-up

- {{FOLLOW_UP}}

## Commit SHA rule

The report, GitHub issue comment, and state file must describe the same artifact commit SHA even when the workflow uses a follow-up metadata commit.

- Before the artifact commit exists, `PENDING_COMMIT_SHA` is acceptable only as a temporary placeholder.
- After the artifact commit exists, update the final issue comment, report, and `.hermes/state.json` so they all reference the real artifact SHA.
- If a follow-up metadata commit is used, the report must explicitly state that the GitHub issue comment is the source of truth for the artifact commit SHA and that the metadata commit is a separate synchronization step.