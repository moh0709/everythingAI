# {{TASK_ID}} — {{TITLE}}

## Result

**Final status:** {{STATUS}}

## Repository / environment

- **Repository path used:** `{{REPO_PATH}}`
- **Current branch:** `{{BRANCH}}`
- **Starting commit SHA:** `{{START_SHA}}`
- **Final commit SHA:** `{{FINAL_SHA}}`

## Files changed

- {{FILES_CHANGED}}

## Validation summary

- Framework doctor: {{FRAMEWORK_DOCTOR}}
- UI typecheck: {{UI_TYPECHECK}}
- UI build: {{UI_BUILD}}
- API tests: {{API_TESTS}}

## Skipped commands / reasons

- {{SKIPS}}

## Follow-up

- {{FOLLOW_UP}}

## Commit SHA rule

The report, GitHub issue comment, and state file must converge on the same final commit SHA.

- Before the commit that produces the artifact SHA is known, it is acceptable to use `PENDING_COMMIT_SHA` as a temporary placeholder.
- After the commit exists, update the final issue comment, report, and `.hermes/state.json` so they all reference the real final SHA.
- If the workflow cannot update all three artifacts atomically, the report must explicitly describe the two-step finalization pattern that was used.