# EverythingAI — Enterprise Canonical Project State

## 1. Document Authority

This file is the canonical, machine- and human-readable state record for EverythingAI.

Authority order:

1. Accepted PM decisions and acceptance comments on GitHub issues.
2. This `PROJECT_STATE.md`.
3. `AI_BOOTSTRAP.md`.
4. Accepted architecture and operating manuals.
5. Accepted handover JSON, reports, logs, commits, and runtime evidence.
6. Unaccepted implementation artifacts and agent statements.

Conflicts must be resolved conservatively. No agent may infer acceptance from implementation completion alone.

## 2. Executive Status

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

## 3. Accepted Baseline

Accepted dependency chain:

- #61 — EAI-TASK-039: Atomic task claiming and duplicate-dispatch prevention
- #63 — EAI-TASK-040: Runtime supervisor and heartbeat foundation
- #64 — EAI-TASK-041: Crash recovery and stale-state reconciliation
- #65 — EAI-TASK-042: Bounded retry and failure classification
- #66 — EAI-TASK-043: Structured event history
- #67 — EAI-TASK-044: Worker health CLI and operational metrics

These form the accepted Phase 3 repository-level reliability baseline.

## 4. Current Dependency Gate

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

## 5. Current Roadmap

1. Complete #76 through direct SSH/root or authorized sudo execution on the Linux host.
2. Install and verify the accepted systemd deployment.
3. Collect live lifecycle, watchdog, restart-bound, lock-conflict, rollback, uninstall, reinstall, and boot-enablement evidence.
4. PM independently reviews #76 and #68.
5. Accept and close #68 only when repository artifacts and live runtime evidence agree.
6. Release #69 only after #68 is accepted and closed.
7. Execute #69 — unattended reliability drill and Phase 3 completion decision.

## 6. Dependency Graph

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

## 7. Governance Controls

- PM releases exactly one dependency-satisfied task.
- Hermes claims only issues carrying both `pm:ready` and `hermes:ready`.
- Hermes must replace `hermes:ready` with `hermes:working` during claim.
- Completion uses `hermes:done` + `pm:review`, or `hermes:blocked` + `pm:review` for truthful blockers.
- PM independently reviews every submission.
- Hermes and ChatGPT must not self-accept their own implementation claims.
- PASS without independently reviewable evidence is invalid.
- BLOCKED is a valid outcome when supported by exact evidence and remediation.
- No later dependency may be released while the current gate is unresolved.

## 8. Definition of Done

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

## 9. Architecture Principles

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

## 10. Environment Inventory

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

## 11. Risk Register

| Risk | Status | Impact | Required control |
|---|---|---:|---|
| Privileged approval gate blocks Hermes provisioning | Open | High | Direct SSH/root or authorized sudo execution |
| Existing cronjob and future systemd worker run concurrently | Open | Critical | Pause/disable legacy cronjob before enabling systemd worker; prove single ownership |
| Degraded systemd state hides unrelated host failures | Open | Medium | Identify unrelated failed units; avoid claiming global system health |
| Secrets exposed during environment provisioning | Controlled | Critical | External file, restrictive permissions, no raw values in evidence |
| Restart storm | Controlled by design, unproven live | High | Bounded restart settings and watchdog observation |
| Duplicate task execution | Controlled in repository, must be revalidated live | Critical | Lock conflict and single-instance tests |
| Phase 3 advanced without host evidence | Prevented | High | #69 remains unreleased |

## 12. Immediate Next Action

The next valid action is direct Linux SSH provisioning following `docs/HERMES_RUNTIME_RUNBOOK.md` and the accepted unit files under `deploy/systemd/`.

Do not requeue #76 to Hermes until host provisioning has been performed outside the restricted Hermes command gate. After provisioning, Hermes may run read-only and non-privileged validation and submit final evidence.

## 13. Change Control

Every update to this file must include:

- exact issue/task reference;
- accepted or blocked status;
- evidence SHA where available;
- dependency impact;
- next released or blocked action;
- no unsupported success claims.
