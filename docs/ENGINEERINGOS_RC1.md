# EngineeringOS RC1

Status: Adopted operating standard  
Repository: `moh0709/everythingAI`  
Applies to: CEO, PM / Architect, Hermes and other engineering agents

## 1. Purpose

EngineeringOS defines how work is selected, implemented, validated, reviewed and accepted. Product documentation remains the authority for what EverythingAI is and how the product behaves.

The operating standard exists to reduce rework, protect product boundaries and ensure that completion claims are supported by evidence.

## 2. Core principles

1. **Reality over assumptions** — Do not claim work exists or is complete until it has been inspected and verified.
2. **Evidence before acceptance** — PM acceptance requires credible validation evidence and consistent artifacts.
3. **Narrow scope wins** — Implement only the approved task. Avoid unrelated cleanup and broad refactors.
4. **Protect existing behavior** — Existing defaults remain stable unless the task explicitly changes them.
5. **Separate product and process** — Product documents define the product; EngineeringOS defines the workflow.
6. **No placeholders at review** — Final artifacts must not contain unresolved placeholders, fake SHAs or inconsistent metadata.
7. **Inherit safety boundaries** — Every task inherits the product safety rules even when the issue does not repeat them.
8. **Reduce friction** — Add process only when it prevents recurring mistakes, lowers risk or reduces review effort.

## 3. Roles

### CEO

Owns product vision, business priority, strategic direction and approval of major changes.

### PM / Architect

Owns roadmap structure, task definition, issue readiness, scope boundaries, sequencing, review and acceptance.

The PM may accept, block, split or redefine work. The PM must not accept work without validation evidence.

### Engineer / Hermes

Owns repository inspection, narrow implementation, validation, artifacts, issue reporting, label transitions and self-audit.

Hermes must not submit work for review until the self-audit passes.

## 4. EverythingAI project profile

- Repository: `moh0709/everythingAI`
- Branch policy: work directly on `main` unless Moe explicitly changes the rule.
- Default validation sequence:

```bash
git pull --ff-only
node scripts/framework-doctor.mjs
cd apps/everything-ai-ui && npm run typecheck
cd apps/everything-ai-ui && npm run build
cd services/api && npm test
```

A task may define additional validation. Skipped validation must be justified with evidence.

## 5. Task lifecycle

```text
Idea or need
  -> PM defines a bounded task
  -> GitHub issue is created
  -> Issue receives pm:ready and hermes:ready
  -> Hermes selects one eligible issue
  -> Hermes marks it hermes:working
  -> Hermes inspects and implements narrowly
  -> Hermes validates the result
  -> Hermes creates required artifacts
  -> Hermes performs the self-audit
  -> Hermes posts PASS, BLOCKED or FAIL
  -> Successful work moves to pm:review and hermes:done
  -> PM reviews and accepts or blocks
  -> Accepted work moves to pm:accepted and hermes:done
```

Only one eligible issue should be actively executed at a time unless the PM explicitly approves parallel work.

## 6. Definition of Ready

A task is ready for Hermes only when all conditions are met:

- An open GitHub issue exists.
- The issue has `pm:ready` and `hermes:ready`.
- The issue has a clear `EAI-TASK-###` identity or another explicit task identity.
- Scope is narrow and bounded.
- Protected boundaries are listed or inherited from the project profile.
- Validation expectations are listed or inherited.
- Required artifacts are listed or inherited.
- No completed report or handover already covers the same task.

Hermes must skip issues that are closed, accepted, in PM review, marked done or already represented by matching completion artifacts.

## 7. Definition of Done

A task is done only when all applicable conditions are met:

- Scope is completed or accurately marked `BLOCKED` or `FAIL`.
- Changed files are listed.
- Validation commands were run, or any omission is explicitly justified.
- A report artifact exists.
- A terminal log exists when command execution occurred.
- A handover exists for implementation work that changes project state or continuation context.
- The issue comment includes `PASS`, `BLOCKED` or `FAIL`.
- Artifact and final pushed commit SHAs are real.
- Report, handover, state and issue comment tell the same finalization story.
- No unresolved placeholders remain.
- Successful submissions carry `pm:review` and `hermes:done`.

If any required condition fails, the task is not ready for PM review.

## 8. Hermes execution procedure

### 8.1 Select

1. Inspect open issues carrying `pm:ready` and `hermes:ready`.
2. Apply the skip rules.
3. Select the highest-priority eligible issue.
4. Confirm issue number and task identity are not being confused.
5. Replace `hermes:ready` with `hermes:working` when execution begins.

### 8.2 Inspect

Before editing:

- Pull the latest `main` with fast-forward only.
- Inspect the actual repository state and relevant files.
- Read applicable product documentation and protected boundaries.
- Confirm that requested behavior does not conflict with accepted state.
- Identify the smallest safe change set.

### 8.3 Implement

- Change only files required by the issue.
- Preserve existing defaults unless explicitly tasked otherwise.
- Do not introduce secrets, credentials or private runtime configuration.
- Do not perform speculative refactors.
- Stop and report `BLOCKED` when a required dependency or decision is missing and cannot be safely inferred.

### 8.4 Validate

Run the project-profile validation commands plus task-specific checks. Capture commands and results in the terminal log.

A validation failure must be fixed, or the task must be reported as `BLOCKED` or `FAIL`. It must never be reported as `PASS`.

### 8.5 Finalize

1. Create or update required report, log and handover artifacts.
2. Commit the implementation and artifacts.
3. Replace temporary metadata with real commit SHAs.
4. Confirm that all final artifacts agree.
5. Push to `main`.
6. Post the final issue comment.
7. Apply the correct labels.

## 9. Hermes self-audit gate

Before PM review, Hermes must answer yes to every applicable item:

- Correct issue number?
- Correct task identity?
- Actual repository inspected before changes?
- Scope kept narrow?
- Unrelated files avoided?
- Secrets and private configuration excluded?
- Product safety boundaries preserved?
- Required validation completed successfully?
- Report, log and handover created as required?
- All placeholders removed?
- Report, handover, issue comment and state consistent?
- Labels correct?

A no answer requires correction before review, or a truthful `BLOCKED` report with evidence.

## 10. PM acceptance review

The PM checks:

- Scope matches the issue.
- Product safety boundaries remain intact.
- Architecture and defaults did not change unexpectedly.
- Validation evidence is credible.
- Required artifacts exist.
- Metadata is complete and consistent.
- No placeholders remain.
- Labels are correct.
- Known follow-up risk is documented.

Decision outcomes:

- `PASS` -> `pm:accepted` + `hermes:done`
- `BLOCKED` -> `pm:blocked`, or remain in `pm:review` with explicit corrections
- `FAIL` -> rework, replacement or cancellation decision

## 11. Artifact standard

### Required implementation artifacts

```text
REPORTS/EAI-TASK-###-*.md
LOGS/EAI-TASK-###-terminal.log
docs/*HANDOVER*.md when implementation affects continuation
GitHub issue completion comment
```

### Report content

- Task ID
- Issue number
- Status: `PASS`, `BLOCKED` or `FAIL`
- Scope summary
- Files changed
- Validation commands and results
- Safety notes
- Artifact commit SHA
- Final pushed commit SHA
- Known limitations
- Next recommended step only when needed

### Handover content

- Current accepted state
- What changed
- What remains protected
- Validation evidence
- Next recommended task when known
- Artifact and final commit SHAs

### Forbidden final metadata

Final review artifacts must not contain:

```text
PENDING
PENDING_COMMIT_SHA
TODO
TBD
fake SHA
unknown final SHA
inconsistent task or issue numbers
```

## 12. GitHub label states

### Ready

- `pm:ready`
- `hermes:ready`

### Working

- `hermes:working`

### PM review

- `pm:review`
- `hermes:done`

### Accepted

- `pm:accepted`
- `hermes:done`

### Blocked

- `pm:blocked`

Hermes must skip any issue that is closed or carries `hermes:done`, `pm:review` or `pm:accepted`, or already has a matching report artifact.

## 13. EverythingAI protected boundaries

Every EverythingAI task inherits these rules:

- Do not break local SQLite MVP startup.
- Do not require PostgreSQL for default local startup.
- Do not run production migrations automatically.
- Do not introduce login requirements unless explicitly tasked.
- Do not change Client Workspace behavior unless explicitly tasked.
- Do not change Admin Dashboard behavior unless explicitly tasked.
- Do not expose provider, API-key or Agent Connector settings in Client Workspace.
- Do not enable the local agent bridge or chat by default.
- Do not allow arbitrary browser-submitted shell commands.
- Do not commit secrets or private runtime configuration.
- Do not perform broad refactors.
- Do not modify unrelated files.
- Do not claim completion without validation evidence.

## 14. Continuous improvement

After each accepted task, the PM asks:

> Did this task reveal a repeated process problem?

Update EngineeringOS only when real repeated friction justifies a narrow change. Avoid expanding the process for theoretical completeness.

## 15. Adoption decision

EngineeringOS RC1 is the active operating standard for new EverythingAI engineering tasks. Future issues should reference it with:

```text
Follow EngineeringOS RC1 and the EverythingAI project profile.
```

The next operating deliverable is the Hermes Operating Manual derived from this standard.