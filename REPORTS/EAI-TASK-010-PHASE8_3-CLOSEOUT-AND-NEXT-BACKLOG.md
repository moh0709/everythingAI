# EAI-TASK-010: Phase 8.3 Closeout and Next Implementation Backlog

**Final status:** SUBMITTED_PENDING_PM_REVIEW

## Forge maintenance refresh

Forge re-open maintenance for issue #32 was executed on 2026-08-01 from `C:\temp\EverythingAI` on `main` at starting SHA `f5e371b4782bae98307ff0d5e23ce3ff2cafe9ae`.

Issue #32 already had prior PASS evidence and final comments from 2026-06-24. This refresh updates the required artifacts with current validation evidence and live-state context. No production app behavior was changed.

## Historical Phase 8.3 closeout

Phase 8.3 was previously documented as closed for the local MVP connector readiness stream. Hermes onboarding was complete for the Phase 8.3-era workflow, and the Admin Connector readiness gate was cleared.

The historical closeout remains preserved in the issue comments and artifacts. This refresh does not self-accept PM work and does not release dependent tasks.

## Current canonical project status

The current authoritative `PROJECT_STATE.md` and `AI_BOOTSTRAP.md` loaded during this refresh show the project has advanced beyond issue #32:

- Phase 2: complete.
- Phase 3: in progress.
- Current phase status: blocked at the live host deployment gate.
- Active prerequisite: issue #76, requiring direct Linux SSH/root or authorized sudo provisioning outside the restricted Hermes command gate.
- Issue #69 remains unreleased until issue #68 is accepted and closed.

## Validation results

Required validation was run from the repository checkout on 2026-08-01. The terminal transcript is in `LOGS/EAI-TASK-010-terminal.log`.

| Command | Result | Evidence |
|---|---|---|
| `git pull --ff-only` | PASS | `Already up to date.` |
| `node scripts/framework-doctor.mjs` | PASS | Framework doctor reported `"status": "PASS"` and valid `.hermes/state.json`. |
| `cd services/api && npm test` | PASS | `173` tests, `173` passed, `0` failed. |
| `cd services/api && node src/scripts/detectAgentConnectors.js` | PASS | Codex and Claude Code found on PATH; detection only, no probes or chat calls. |
| `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex claudeCode` | PASS | Codex `codex-cli 0.146.0`; Claude Code `2.1.209 (Claude Code)`; no chat calls. |
| `cd apps/everything-ai-ui && npm run typecheck` | PASS | `tsc --noEmit` exited `0`. |
| `cd apps/everything-ai-ui && npm run build` | PASS | Vite build completed successfully. |

Note: an initial wrapper attempt used a relative log path after changing directories and one probe attempt set the PowerShell env var incorrectly. The corrected required commands above passed and are recorded in the log.

## Connector and readiness status

- Admin Connector readiness gate: cleared for Codex and Claude Code safe detection/version-probe coverage.
- Codex: detected on PATH at `C:\nvm4w\nodejs\codex.cmd`; safe version probe passed with `codex-cli 0.146.0`.
- Claude Code: detected on PATH at `C:\Users\Mohamed Ismail\.local\bin\claude.exe`; safe version probe passed with `2.1.209 (Claude Code)`.
- Agent bridge execution remained disabled by default and was enabled only for the explicit safe version-probe command.
- Agent chat execution remained disabled.
- Arbitrary shell execution remained blocked.

## Remaining known risks

- Current canonical work is blocked by live host systemd provisioning evidence for issues #68/#76.
- Direct SSH/root or authorized sudo is required for the current live host gate; this refresh did not perform privileged host mutations.
- The existing Hermes scheduled runtime must not run concurrently with the future systemd poller.
- Secrets must remain external to evidence and were not recorded in this task.
- Branch protection remains a governance/configuration concern; this task used focused commits on `main`.
- Existing unrelated local worktree changes were present before this refresh and were preserved.

## Recommended implementation tasks

The historical Phase 8.4 local-MVP backlog is preserved in `docs/NEXT_IMPLEMENTATION_BACKLOG_2026-06-24.md`. The current canonical next actions are:

1. Complete issue #76 through direct Linux SSH/root or authorized sudo host provisioning.
2. Install and verify the accepted systemd deployment from `deploy/systemd/`.
3. Collect live lifecycle, watchdog, restart-bound, lock-conflict, rollback, uninstall, reinstall, and boot-enablement evidence.
4. Submit #76 for PM review with sanitized host evidence.
5. Return issue #68 to PM review only after repository artifacts and live runtime evidence agree.
6. Keep issue #69 unreleased until #68 is accepted and closed.
7. Execute issue #69 unattended reliability drill only after the dependency gate clears.

## First task to assign

Current canonical first action: **complete issue #76 host provisioning through direct SSH/root or authorized sudo execution**.

Historical issue #32 first local-MVP implementation recommendation remains: **Controlled connector-specific setup/testing for installed Codex**.

## Artifact commit SHA

`PENDING_METADATA_SYNC`
