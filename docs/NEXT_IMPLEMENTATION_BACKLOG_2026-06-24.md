# Next Implementation Backlog - 2026-06-24

Phase 8.3 was previously closed for the local MVP connector-readiness stream. This backlog is preserved for issue #32 review, with a 2026-08-01 Forge maintenance note: the current canonical project state has advanced to Phase 3 and is blocked at issues #68/#76 pending live host provisioning evidence. Do not release later dependent work until that current gate is accepted.

## Current Canonical Priority

### 1. Complete issue #76 live host provisioning

- **Why it matters:** The current project gate requires direct Linux SSH/root or authorized sudo provisioning before systemd lifecycle evidence can be collected.
- **Files likely involved:**
  - `docs/HERMES_RUNTIME_RUNBOOK.md`
  - `deploy/systemd/**`
  - issue #76 evidence artifacts
  - `.hermes/state.json`
- **Acceptance criteria:**
  - Dedicated runtime account and deployment paths are created on the live host.
  - Version-controlled systemd units are installed.
  - Secrets remain outside repository evidence.
  - Sanitized host evidence proves the required lifecycle checks.
- **Validation commands:**
  - Host runbook commands from `docs/HERMES_RUNTIME_RUNBOOK.md`
  - `systemd-analyze verify <unit files>`
  - `systemctl status <accepted units>`
  - repository validation required by issue #76
- **Executor:** Human/operator or authorized direct SSH execution first; Hermes may collect non-privileged follow-up evidence after provisioning.

### 2. Complete issue #68 systemd deployment PM review

- **Why it matters:** Issue #68 is the parent gate for the current Phase 3 reliability path.
- **Files likely involved:**
  - `deploy/systemd/**`
  - `docs/HERMES_RUNTIME_RUNBOOK.md`
  - `REPORTS/**`
  - `LOGS/**`
  - `.hermes/state.json`
- **Acceptance criteria:**
  - Repository artifacts and live host evidence agree.
  - Watchdog recovery and bounded restart evidence are reviewable.
  - Rollback/uninstall/reinstall evidence is sanitized and complete.
- **Validation commands:**
  - `node scripts/framework-doctor.mjs`
  - issue #68 required validation
  - live host lifecycle checks from the accepted runbook
- **Executor:** Hermes can submit evidence after host provisioning; PM must independently review.

### 3. Run issue #69 unattended reliability drill

- **Why it matters:** This is the next dependency after #68 and should remain unreleased until #68 is accepted.
- **Files likely involved:**
  - runtime worker scripts under `scripts/`
  - `src/task-queue.js`
  - `LOGS/**`
  - `REPORTS/**`
  - `.hermes/state.json`
- **Acceptance criteria:**
  - Drill runs only after #68 is accepted.
  - Single-ownership and duplicate-dispatch protections remain intact.
  - Evidence is chronological and independently reviewable.
- **Validation commands:**
  - `node scripts/framework-doctor.mjs`
  - applicable worker health and runtime checks from the released issue
- **Executor:** Hermes should execute only after PM release.

## Historical Phase 8.4 Local-MVP Backlog

### 4. Controlled connector-specific setup/testing for installed Codex

- **Why it matters:** Codex is detected and version-probed successfully; the remaining historical local-MVP work is controlled setup/testing, not new connector discovery.
- **Files likely involved:**
  - `services/api/src/scripts/detectAgentConnectors.js`
  - `services/api/src/scripts/probeAgentVersions.js`
  - `services/api/src/agents/localAgentBridge.js`
  - `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
  - docs under `docs/`
- **Acceptance criteria:**
  - Codex remains detected on PATH.
  - Version probe remains safe and successful.
  - Admin-only boundary remains intact.
  - No arbitrary shell execution is introduced.
- **Validation commands:**
  - `node scripts/framework-doctor.mjs`
  - `cd services/api && node src/scripts/detectAgentConnectors.js`
  - `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js codex`
- **Executor:** Hermes should execute after the current dependency gate allows product backlog work.

### 5. Controlled connector-specific setup/testing for installed Claude Code

- **Why it matters:** Claude Code is also detected and version-probed successfully and should follow the same controlled setup discipline as Codex.
- **Files likely involved:**
  - `services/api/src/scripts/detectAgentConnectors.js`
  - `services/api/src/scripts/probeAgentVersions.js`
  - `services/api/src/agents/localAgentBridge.js`
  - `apps/everything-ai-ui/src/admin/components/AgentConnectorsPanel.tsx`
- **Acceptance criteria:**
  - Claude Code remains detected on PATH.
  - Safe version probe succeeds.
  - Connector remains admin-only and bridge-safe.
- **Validation commands:**
  - `cd services/api && node src/scripts/detectAgentConnectors.js`
  - `cd services/api && EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true node src/scripts/probeAgentVersions.js claudeCode`
- **Executor:** Hermes should execute after dependency release.

### 6. Continue frontend modularization and cleanup of legacy admin paths

- **Why it matters:** This improves maintainability without changing core product behavior.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/admin/**`
  - `apps/everything-ai-ui/src/components/**`
  - `apps/everything-ai-ui/src/styles/**`
- **Acceptance criteria:**
  - Admin paths are simpler to navigate.
  - UI routing and admin-only boundaries do not regress.
  - Existing smoke coverage still passes.
- **Validation commands:**
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
- **Executor:** ChatGPT can plan it directly; Hermes should execute file changes.

### 7. Improve API key lifecycle UX: saved, replace, clear

- **Why it matters:** Better provider-key handling reduces operator friction and makes Admin settings easier to trust.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
  - provider settings UI components
  - provider routes under `services/api/src/**`
- **Acceptance criteria:**
  - UI clearly distinguishes saved, replace, and clear flows.
  - Key masking remains intact.
  - Admin-only boundaries remain unchanged.
- **Validation commands:**
  - `cd services/api && npm test`
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
- **Executor:** Hermes should execute after PM release.

### 8. Improve rich citation/source highlighting and extracted document formatting

- **Why it matters:** Better source rendering improves trust and makes the Knowledge Base easier to read and verify.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/client/**`
  - extraction/rendering paths under `services/api/src/**`
  - documentation for source/reference rendering
- **Acceptance criteria:**
  - Source references are easier to inspect.
  - Citation/highlight behavior is clearer in the UI.
  - Existing extraction/search behavior remains stable.
- **Validation commands:**
  - `cd services/api && npm test`
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
- **Executor:** Hermes should execute after PM release.

### 9. Update release checklist after the dependency gate clears

- **Why it matters:** Closeout documentation must match the accepted current state, not stale milestone assumptions.
- **Files likely involved:**
  - `docs/ROADMAP.md`
  - `docs/IMPLEMENTATION_ROADMAP.md`
  - release/checklist docs under `docs/`
- **Acceptance criteria:**
  - Current phase and dependencies are reflected clearly.
  - Next priorities are visible and actionable.
  - No production code behavior changes.
- **Validation commands:**
  - `node scripts/framework-doctor.mjs`
  - documentation review
- **Executor:** ChatGPT can draft; Hermes can execute repository edits.

## Recommended First Assignment

Current canonical first assignment: **Complete issue #76 live host provisioning**.

Historical issue #32 local-MVP first assignment: **Controlled connector-specific setup/testing for installed Codex**.
