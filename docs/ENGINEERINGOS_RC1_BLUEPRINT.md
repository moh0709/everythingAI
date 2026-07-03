# EngineeringOS RC1 Blueprint

Status: RC1 blueprint finalized
Repository: `moh0709/everythingAI`
Prepared for: CEO / PM / Hermes operating model

---

## 1. Purpose

EngineeringOS is the lightweight operating system for how the CEO, PM, and engineering agents work together.

It is separate from the EverythingAI product.

EverythingAI answers:

```text
What are we building?
```

EngineeringOS answers:

```text
How do we build it safely, quickly, and consistently?
```

RC1 is intentionally minimal. It exists to reduce repeated instructions, reduce PM correction work, and make Hermes review-ready on first submission.

---

## 2. Design constraint

EngineeringOS must make the team faster, not slower.

A rule belongs in EngineeringOS only if it does at least one of the following:

```text
- prevents recurring mistakes
- reduces PM review time
- protects product safety boundaries
- improves validation quality
- removes repeated decision-making
- improves handover continuity
```

If a rule adds process cost without reducing rework or risk, it does not belong in RC1.

---

## 3. Scope of EngineeringOS RC1

RC1 covers only the minimum operating model needed for current EverythingAI work:

```text
1. Principles
2. Roles
3. Task lifecycle
4. Definition of Ready
5. Definition of Done
6. Engineer self-audit
7. PM acceptance review
8. Artifact standards
9. GitHub issue workflow
10. Continuous improvement
```

RC1 does not try to solve all future enterprise governance. Major product governance remains in EverythingAI product documentation.

---

## 4. Source hierarchy

### 4.1 Engineering process authority

EngineeringOS is the authority for:

```text
- how tasks are created
- how engineers work
- how validation is reported
- how artifacts are produced
- how PM reviews work
- how issue labels move
- how metadata is finalized
- how process improvements are captured
```

### 4.2 Product authority

EverythingAI product documentation remains the authority for:

```text
- product identity
- architecture
- roadmap
- safety invariants
- feature scope
- product-specific validation commands
- production-readiness status
```

### 4.3 Project profile

Each product may have a project-specific profile that points to EngineeringOS and defines only local overrides such as validation commands, protected files, product invariants, and branch policy.

For EverythingAI, the current profile is:

```text
Repository: moh0709/everythingAI
Branch policy: work directly on main unless Moe explicitly changes this rule
Default validation:
  git pull --ff-only
  node scripts/framework-doctor.mjs
  cd apps/everything-ai-ui && npm run typecheck
  cd apps/everything-ai-ui && npm run build
  cd services/api && npm test
```

---

## 5. Principles

These principles guide every task.

### P1 — Reality over assumptions

Do not claim work is complete unless it exists and has been verified.

### P2 — Evidence before acceptance

PM acceptance requires validation evidence, artifacts, and consistent metadata.

### P3 — Narrow scope wins

Implement only what the task asks. Do not perform broad refactors or unrelated cleanup.

### P4 — Protect existing behavior

Default behavior must remain stable unless the task explicitly changes it.

### P5 — Product and process are separate

Product documentation describes the product. EngineeringOS describes how the team works.

### P6 — No placeholders at review

A task is not ready for PM review if final artifacts contain `PENDING`, `TODO`, fake SHAs, unresolved placeholders, or inconsistent metadata.

### P7 — Safety boundaries are inherited

Every task inherits the product’s non-negotiable safety boundaries even if the issue does not repeat them.

### P8 — EngineeringOS reduces friction

The process should remove repeated instructions and decisions. It should not become bureaucracy.

---

## 6. Roles

### CEO

Owns:

```text
- product vision
- business priority
- final direction
- approval of major changes in strategy
```

The CEO should not need to inspect every technical artifact unless the PM escalates a decision.

### PM / Architect

Owns:

```text
- roadmap structure
- task definition
- issue readiness
- scope boundaries
- PM review
- acceptance or rejection
- EngineeringOS evolution
```

The PM may accept, block, split, redefine, or sequence tasks.

The PM must not accept a task without validation evidence.

### Engineer / Hermes

Owns:

```text
- implementation
- local reasoning and repo inspection
- validation commands
- report/log/handover artifacts
- GitHub issue comment
- label transitions
- self-audit before PM review
```

Hermes must not submit a task for PM review until the self-audit passes.

---

## 7. Task lifecycle

```text
Idea / need
  -> PM defines task
  -> GitHub issue created
  -> Issue receives pm:ready + hermes:ready
  -> Hermes selects one eligible issue
  -> Hermes implements narrowly
  -> Hermes validates
  -> Hermes creates artifacts
  -> Hermes performs self-audit
  -> Hermes posts PASS / BLOCKED / FAIL comment
  -> Hermes moves labels to pm:review + hermes:done
  -> PM reviews
  -> PM accepts or blocks
  -> Issue moves to pm:accepted or pm:blocked
  -> Next task is created only after accepted state or explicit PM decision
```

---

## 8. Definition of Ready

A task is ready for Hermes only when all are true:

```text
[ ] GitHub issue exists
[ ] Issue has pm:ready
[ ] Issue has hermes:ready
[ ] Issue is open
[ ] Issue has a clear EAI-TASK ID or explicit task identity
[ ] Scope is narrow and bounded
[ ] Protected product boundaries are listed or referenced
[ ] Expected validation is listed or inherited from the project profile
[ ] Expected artifacts are listed or inherited from EngineeringOS
[ ] No conflict with completed reports/handovers
```

Hermes must skip issues that are closed, already accepted, in PM review, marked done, or already have matching report artifacts.

---

## 9. Definition of Done

A task is done only when all are true:

```text
[ ] Scope completed or clearly marked BLOCKED/FAIL
[ ] Changed files are listed
[ ] Validation commands were run or explicitly justified if skipped
[ ] Report artifact exists
[ ] Log artifact exists when command execution occurred
[ ] Handover artifact exists for implementation tasks
[ ] GitHub issue comment includes PASS / BLOCKED / FAIL
[ ] Artifact commit SHA is real
[ ] Final pushed commit SHA is real
[ ] Report, handover, state file, and issue comment tell the same finalization story
[ ] No unresolved placeholders remain in final artifacts
[ ] Labels moved to pm:review + hermes:done for successful implementation submission
```

If any box fails, the task is not ready for PM review.

---

## 10. Hermes self-audit gate

Before submitting for PM review, Hermes must check:

```text
[ ] Did I work on the correct issue number?
[ ] Did I work on the correct EAI-TASK number?
[ ] Did I avoid confusing task number with issue number?
[ ] Did I inspect the actual repo before changing files?
[ ] Did I keep scope narrow?
[ ] Did I avoid unrelated files?
[ ] Did I avoid secrets, tokens, credentials, and private env values?
[ ] Did I preserve product safety boundaries?
[ ] Did validation pass?
[ ] Did I create report/log/handover artifacts?
[ ] Did I remove all PENDING/TODO/placeholders from final artifacts?
[ ] Do report, handover, issue comment, and state file agree?
[ ] Did I update labels correctly?
```

If the answer to any item is no, Hermes must fix the issue before PM review or submit BLOCKED with evidence.

---

## 11. PM acceptance review

PM review should be short and focused.

PM checks:

```text
[ ] Scope matches issue
[ ] Product safety boundaries preserved
[ ] Architecture not changed unexpectedly
[ ] Default behavior protected
[ ] Tests/validation are credible
[ ] Artifacts exist
[ ] Metadata is complete
[ ] No placeholders remain
[ ] GitHub labels are correct
[ ] Follow-up risk is documented
```

PM decision outcomes:

```text
PASS       -> pm:accepted + hermes:done
BLOCKED    -> pm:blocked or pm:review with required corrections
FAIL       -> task failed and must be reworked or replaced
```

PM should not spend time repairing basic metadata. Repeated metadata failures become EngineeringOS improvements.

---

## 12. Artifact standards

### Required implementation artifacts

```text
REPORTS/EAI-TASK-###-*.md
LOGS/EAI-TASK-###-terminal.log
HANDOVER file under docs/ when the implementation changes state or affects continuation
GitHub issue completion comment
```

### Report must include

```text
- task ID
- issue number
- status: PASS / BLOCKED / FAIL
- scope summary
- files changed
- validation results
- safety notes
- artifact commit SHA
- final pushed commit SHA
- known limitations
- next recommended step only if needed
```

### Handover must include

```text
- current accepted state
- what changed
- what remains protected
- validation evidence
- next recommended task if known
- artifact and final commit SHA
```

### Metadata rule

Temporary placeholders are allowed while creating artifacts, but they are forbidden at PM review.

Forbidden in final review artifacts:

```text
PENDING
PENDING_COMMIT_SHA
TODO
TBD
fake SHA
unknown final SHA
inconsistent task/issue numbers
```

---

## 13. GitHub issue workflow

### Ready for Hermes

```text
pm:ready
hermes:ready
```

### Hermes working

```text
hermes:working
```

### Ready for PM review

```text
pm:review
hermes:done
```

### Accepted

```text
pm:accepted
hermes:done
```

### Blocked

```text
pm:blocked
```

### Skip rules

Hermes must skip issues with:

```text
hermes:done
pm:review
pm:accepted
closed state
matching report artifact already present
```

---

## 14. EverythingAI protected boundaries

Until the EverythingAI project profile is separated, every EverythingAI task inherits these protected boundaries:

```text
- Do not break local SQLite MVP startup
- Do not require PostgreSQL during default local startup
- Do not run production migrations automatically
- Do not introduce login requirements unless explicitly tasked
- Do not change Client Workspace behavior unless explicitly tasked
- Do not change Admin Dashboard behavior unless explicitly tasked
- Do not expose provider/API-key/Agent Connector settings in Client Workspace
- Do not enable local agent bridge/chat by default
- Do not allow arbitrary browser-submitted shell commands
- Do not commit secrets or private runtime configuration values
- Do not perform broad refactors
- Do not modify unrelated files
- Do not claim completion without validation evidence
```

---

## 15. Continuous improvement

After every accepted task, PM asks one question:

```text
Did this task reveal a repeated process problem?
```

If yes, update EngineeringOS narrowly.

Examples:

```text
- PM had to fix metadata twice -> strengthen self-audit
- Hermes confused issue number with task number -> add task/issue identity check
- Validation skipped without reason -> update validation rule
- Handover too heavy -> simplify template
```

EngineeringOS should evolve only from real friction, not theoretical completeness.

---

## 16. RC1 adoption plan

### Step 1

Create EngineeringOS RC1 from this blueprint.

### Step 2

Create Hermes Operating Manual derived from RC1.

### Step 3

Create EverythingAI project profile that references EngineeringOS and lists only product-specific details.

### Step 4

Update future GitHub issues to say:

```text
Follow EngineeringOS RC1 and the EverythingAI project profile.
```

### Step 5

Resume EverythingAI roadmap under the new operating model.

---

## 17. Final blueprint decision

This blueprint is sufficient to proceed to Deliverable 3:

```text
EngineeringOS RC1
```

Deliverable 3 should convert this blueprint into the actual operating standard used by CEO, PM, and Hermes.
