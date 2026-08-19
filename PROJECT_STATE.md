# 2026-08-16 CEO-Approved Reconciliation Overlay

> This section is the current operating state and supersedes conflicting phase labels, role assignments, dependency conclusions, and “immediate next action” statements later in this historical document. The detailed legacy sections remain for evidence and traceability. Full decision record: `docs/PHASE0_RECONCILIATION_BASELINE_2026-08-14.md`.

## Current program stage

EverythingAI is in **Reconciliation and Release Control**. Progress is tracked across five independent tracks instead of one overloaded phase number:

1. Product and UX
2. Knowledge and Safe Action
3. Enterprise Platform
4. Engineering Operations
5. Governance and Autonomous Delivery

The **local MVP release candidate passed** on 2026-08-20. The temporary major-feature freeze was lifted after:

1. open issue state is reconciled;
2. execution ownership is explicit;
3. canonical state and roadmaps are synchronized;
4. the local MVP release-candidate baseline is defined; and
5. the complete release-candidate acceptance matrix passed on one unchanged commit.

## Verified governance state

- Issue #103 is PM-accepted and closed.
- Issue #105 is closed as `not planned` after the CEO removed Forge as a prerequisite on 2026-08-19. Its missing scheduler evidence did not pass and must not be cited as accepted soak proof.
- Issue #69 is protected and must not be modified or released without explicit CEO authorization.
- Issues #6–#13 were independently PM-reviewed and closed as completed on 2026-08-19 after the candidate backend suite passed. Issue #5 was also accepted and closed as completed. Issues #4 and #19 were closed as superseded/not planned because they target obsolete or umbrella UI scope.
- Issues #3 and #106 are PM-accepted and closed as completed after the final local MVP release-candidate decision passed.
- Issue #78 is PM-accepted for closure after its atomic/idempotent claim transition passed local and CI validation on commit `74b5335b67c01d44b64321dae4a374b599586a05`.
- Linux systemd issues #68/#76 belong to the Engineering Operations / infrastructure track. They do not silently block unrelated product work unless required by the selected milestone.

## Execution authority

- Product Owner / CEO: Mohammad Ismail.
- Sole PM and release authority: ChatGPT.
- Direct execution authority: ChatGPT may implement and validate dependency-satisfied work under the CEO decision of 2026-08-19; evidence and final review remain distinguishable.
- Optional code executor: Forge may be used only when explicitly released for a future task; it is not a Phase 0 dependency.
- Hermes: explicitly assigned, non-overlapping infrastructure or operational work only.
- Human operator: privileged host, SSH, root, sudo, secret, and other actions outside safe automation boundaries.

Exactly one dependency-satisfied task may be released at a time for each authorized queue, and queue ownership must remain mutually exclusive.

## Immediate priority order

1. Preserve the accepted local MVP candidate and its reproducible CI acceptance sequence.
2. Preserve the exact closure evidence for completed issues #106 and #3.
3. Resume the five tracks in dependency order while keeping production-only capabilities behind their own gates.
4. Preserve the accepted Atlas claim boundary and keep #69 protected from modification or release.
5. Maintain canonical state, evidence, rollback paths, and truthful blockers as the program advances.

## Evidence baseline

- CEO-approved reconciliation: `docs/PHASE0_RECONCILIATION_BASELINE_2026-08-14.md`
- Latest accepted issue audit: #103 and commit `1816018e38639a2f59a6af478d13abf8bf73bda8`
- Historical Forge blocker, superseded without a pass claim: `docs/HANDOVER_2026-08-06_ISSUE_105_FORGE_AUTONOMOUS_CYCLE.json`
- Defined release-candidate scope: `docs/LOCAL_MVP_RELEASE_CANDIDATE_BASELINE_2026-08-16.md`
- Completed validation task: issue #106 (`RC_PASS`; PM-accepted and closed completed)
- Candidate validated by CI: `b89e91a2a362914a0c71f60be95725acb8363aff`
- CI evidence: `https://github.com/moh0709/everythingAI/actions/runs/32309409263`
- Current evidence: `REPORTS/LOCAL_MVP_RELEASE_CANDIDATE_VALIDATION.md`
- Atlas atomic-claim implementation: `74b5335b67c01d44b64321dae4a374b599586a05`
- Atlas CI evidence: `https://github.com/moh0709/everythingAI/actions/runs/32315159757`
- Atlas acceptance report: `REPORTS/ATLAS_ATOMIC_CLAIM_ISSUE_78.md`

---

# EverythingAI — Enterprise Canonical Project State

## 1. Document Authority

This file is the canonical, machine- and human-readable state record for EverythingAI.

Authority order:

1. Explicit Product Owner / CEO decisions.
2. Accepted PM decisions and acceptance comments on GitHub issues.
3. This `PROJECT_STATE.md`.
4. `AI_BOOTSTRAP.md`.
5. Accepted architecture and operating manuals, ADRs, runbooks, and issue bodies.
6. Accepted handover JSON, reports, logs, commits, and runtime evidence.
7. Unaccepted implementation artifacts and agent statements.

The authority hierarchy determines conflict resolution only. It must never be interpreted as preventing an agent from loading, reading, comparing, validating, or—when authorized—updating lower-ranked authoritative documents.

Conflicts must be resolved conservatively. No agent may infer acceptance from implementation completion alone.

## 2. Authoritative Context Retrieval Contract

Before making a project-state decision or beginning implementation, the acting agent must load both:

1. `PROJECT_STATE.md`
2. `AI_BOOTSTRAP.md`

A failed lookup through one mechanism is not evidence that a file is unavailable or that access is read-only. The agent must use the available retrieval fallbacks in this order where applicable:

1. GitHub repository file on the default branch.
2. Known repository path, explicit branch, commit, or repository URL.
3. Connected File Library copy.
4. Current-conversation attachment or materialized copy.
5. Only after all available routes fail may the agent report the context as unavailable or return `BLOCKED`.

Before claiming repository read or write access is unavailable, the agent must inspect the available connector/tool capabilities and verify whether repository read and write actions exist. Capability limits must be based on tool-supported evidence, not inference from one failed request.

A retrieval failure must be documented with the attempted source, exact failure, fallback attempts, and impact. It must not silently weaken governance or halt otherwise authorized work.

## 3. Executive Status

- Program: EverythingAI
- Repository: `moh0709/everythingAI`
- Default execution branch: `main`
- Product Owner / CEO: Mohammad Ismail
- Lead Architect / PM / QA: ChatGPT
- Execution agent: Hermes AI
- Coordination system: GitHub Issues
- Phase 2: Complete
- Phase 3: In progress
- Current phase status: BLOCKED at live host deployment gate

## 4. Accepted Baseline

Accepted dependency chain:

- #61 — EAI-TASK-039: Atomic task claiming and duplicate-dispatch prevention
- #63 — EAI-TASK-040: Runtime supervisor and heartbeat foundation
- #64 — EAI-TASK-041: Crash recovery and stale-state reconciliation
- #65 — EAI-TASK-042: Bounded retry and failure classification
- #66 — EAI-TASK-043: Structured event history
- #67 — EAI-TASK-044: Worker health CLI and operational metrics

These form the accepted Phase 3 repository-level reliability baseline.

## 5. Current Dependency Gate

### Parent task

- Issue #68 — EAI-TASK-045: Add systemd deployment and watchdog recovery
- State: Open
- PM disposition: BLOCKED pending live host evidence
- Required labels while blocked: `hermes:blocked` + `pm:review`

### Active prerequisite

- Issue #76 — EAI-TASK-045A: Provision Hermes host and complete live systemd lifecycle verification
- State: Open
- Result: BLOCKED
- Reason: Hermes scheduled and interactive execution environments cannot pass the platform privileged-command approval gate.
- Latest known evidence commit: `0d64518c69d04a79b4188e72d27e54822fae7331`

### Verified live-host gaps

- Linux account `hermes`: absent at the time of the latest verified Hermes inspection
- `/opt/everythingAI`: absent
- `/etc/hermes`: absent
- `/etc/hermes/everythingai.env`: absent
- Version-controlled systemd units: not installed
- `hermes-runtime.target`: not installed
- `hermes-watchdog.timer`: not installed
- `systemctl is-system-running`: degraded because of unrelated failed units

### Existing operational runtime

Hermes is already functioning through an internal scheduled job rather than the target systemd deployment:

- Job name: `EverythingAI repo worker every 60 sec`
- Working directory: `/root/.hermes/projects/everythingAI`
- Runtime mode: `POLLING`
- Queue contract: open issue with both `pm:ready` and `hermes:ready`
- Proven behavior: automatic issue discovery, claim, label transition, and completion

This existing runtime is operational but does not satisfy the Phase 3 boot persistence, dedicated-account, watchdog, rollback, uninstall, and host lifecycle acceptance criteria.

## 6. Current Roadmap

1. Complete #76 through direct SSH/root or authorized sudo execution on the Linux host.
2. Install and verify the accepted systemd deployment.
3. Collect live lifecycle, watchdog, restart-bound, lock-conflict, rollback, uninstall, reinstall, and boot-enablement evidence.
4. PM independently reviews #76 and #68.
5. Accept and close #68 only when repository artifacts and live runtime evidence agree.
6. Release #69 only after #68 is accepted and closed.
7. Execute #69 — unattended reliability drill and Phase 3 completion decision.

## 7. Dependency Graph

```text
#61 accepted
  -> #63 accepted
    -> #64 accepted
      -> #65 accepted
        -> #66 accepted
          -> #67 accepted
            -> #68 BLOCKED
              -> #76 BLOCKED prerequisite
                -> direct SSH provisioning required
                  -> #68 PM acceptance
                    -> #69 release
```

Only one dependency-satisfied execution task may carry both queue labels at a time.

## 8. Governance Controls

- PM releases exactly one dependency-satisfied task.
- Hermes claims only issues carrying both `pm:ready` and `hermes:ready`.
- Hermes must replace `hermes:ready` with `hermes:working` during claim.
- Completion uses `hermes:done` + `pm:review`, or `hermes:blocked` + `pm:review` for truthful blockers.
- PM independently reviews every submission.
- Hermes and ChatGPT must not self-accept their own implementation claims.
- PASS without independently reviewable evidence is invalid.
- BLOCKED is a valid outcome when supported by exact evidence and remediation.
- No later dependency may be released while the current gate is unresolved.
- Context retrieval and tool-capability verification are mandatory before declaring an access blocker.
- A transient connector failure must not be promoted into a project-state limitation without fallback verification.

## 9. Definition of Done

A task is done only when all applicable evidence agrees:

- issue acceptance criteria;
- source implementation;
- tests and validation commands;
- reports and terminal logs;
- handover JSON;
- `.hermes/state.json`;
- GitHub labels and comments;
- commit history and pushed SHA;
- live runtime behavior;
- rollback and operational procedures;
- PM acceptance decision.

Repository-only validation cannot substitute for required production or host evidence.

## 10. Architecture Principles

- Explicit runtime modes
- Poller, webhook, and gateway separation
- Single claim authority
- Atomic local ownership
- Conservative crash recovery
- Bounded retries
- Durable append-only evidence
- Read-only health tooling
- Dependency-ordered execution
- Least privilege
- External secret storage
- Reversible deployment
- Truthful BLOCKED outcomes
- Multi-source authoritative-context retrieval
- Evidence-based capability declarations

## 11. Environment Inventory

### Existing Hermes runtime

- Host type: Linux VPS
- Current execution identity: existing Hermes platform/root-managed runtime
- Checkout: `/root/.hermes/projects/everythingAI`
- Scheduler: Hermes internal cronjob
- Frequency: every 60 seconds

### Target hardened runtime

- Service identity: `hermes` system account
- Deployment directory: `/opt/everythingAI`
- Protected configuration: `/etc/hermes/everythingai.env`
- Supervisor: systemd
- Monitoring: heartbeat-based watchdog
- Required properties: bounded restart, boot persistence, single-instance ownership, reversible install/uninstall

## 12. Risk Register

| Risk | Status | Impact | Required control |
|---|---|---:|---|
| Privileged approval gate blocks Hermes provisioning | Open | High | Direct SSH/root or authorized sudo execution |
| Existing cronjob and future systemd worker run concurrently | Open | Critical | Pause/disable legacy cronjob before enabling systemd worker; prove single ownership |
| Degraded systemd state hides unrelated host failures | Open | Medium | Identify unrelated failed units; avoid claiming global system health |
| Secrets exposed during environment provisioning | Controlled | Critical | External file, restrictive permissions, no raw values in evidence |
| Restart storm | Controlled by design, unproven live | High | Bounded restart settings and watchdog observation |
| Duplicate task execution | Controlled in repository, must be revalidated live | Critical | Lock conflict and single-instance tests |
| Phase 3 advanced without host evidence | Prevented | High | #69 remains unreleased |
| False access limitation from a failed lookup | Controlled by governance | High | Mandatory fallback retrieval and tool-capability verification |
| Stale File Library copy diverges from repository | Open | Medium | Prefer default-branch repository copy and compare versions before use |

## 13. Immediate Next Action

The next valid implementation action is direct Linux SSH provisioning following `docs/HERMES_RUNTIME_RUNBOOK.md` and the accepted unit files under `deploy/systemd/`.

Do not requeue #76 to Hermes until host provisioning has been performed outside the restricted Hermes command gate. After provisioning, Hermes may run read-only and non-privileged validation and submit final evidence.

Before any future execution session, load and compare both authoritative documents using the retrieval contract in Section 2. Retrieval problems must be exhausted through available fallbacks before execution is declared blocked.

## 14. Change Control

Every update to this file must include:

- exact issue/task reference;
- accepted or blocked status;
- evidence SHA where available;
- dependency impact;
- next released or blocked action;
- no unsupported success claims;
- confirmation that both authoritative documents were loaded or the exact exhausted retrieval failure;
- confirmation that any claimed repository capability limitation was tool-verified.
