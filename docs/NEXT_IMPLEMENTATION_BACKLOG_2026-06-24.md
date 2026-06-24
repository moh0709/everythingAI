# Next Implementation Backlog — 2026-06-24

This backlog follows the Phase 8.3 closeout and prioritizes the next concrete product-development work. The order below reflects roadmap priority and readiness risk.

## 1) Controlled connector-specific setup/testing for installed Codex
- **Why it matters:** Codex is now detected and version-probed successfully; the remaining work is controlled setup/testing, not new connector discovery.
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
- **Executor:** Hermes should execute.

## 2) Controlled connector-specific setup/testing for installed Claude Code
- **Why it matters:** Claude Code is also detected and version-probed successfully; it should be treated with the same controlled setup discipline as Codex.
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
- **Executor:** Hermes should execute.

## 3) Continue frontend modularization and cleanup of legacy admin paths
- **Why it matters:** This is low-risk UI cleanup that improves maintainability without changing core product behavior.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/admin/**`
  - `apps/everything-ai-ui/src/components/**`
  - `apps/everything-ai-ui/src/styles/**`
- **Acceptance criteria:**
  - Admin paths are simplified and easier to navigate.
  - No regression in UI routing or admin-only boundaries.
  - Existing smoke coverage still passes.
- **Validation commands:**
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
- **Executor:** ChatGPT can plan it directly; Hermes should execute if file changes are made.

## 4) Improve API key lifecycle UX: saved / replace / clear
- **Why it matters:** Better provider-key handling reduces operator friction and makes Admin settings easier to trust.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/admin/components/SettingsView.tsx`
  - `apps/everything-ai-ui/src/admin/components/ProviderSettingsPanel.tsx`
  - `services/api/src/routes/*provider*`
- **Acceptance criteria:**
  - UI clearly distinguishes saved, replace, and clear flows.
  - Key masking remains intact.
  - Admin-only boundaries remain unchanged.
- **Validation commands:**
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
  - Relevant API tests under `cd services/api && npm test`
- **Executor:** Hermes should execute.

## 5) Improve rich citation/source highlighting and extracted document formatting
- **Why it matters:** Better source rendering improves trust and makes the Knowledge Base easier to read and verify.
- **Files likely involved:**
  - `apps/everything-ai-ui/src/client/**`
  - `services/api/src/**` extraction/rendering paths
  - docs for source/reference rendering
- **Acceptance criteria:**
  - Source references are easier to inspect.
  - Citation/highlight behavior is clearer in the UI.
  - Existing extraction/search behavior remains stable.
- **Validation commands:**
  - `cd services/api && npm test`
  - `cd apps/everything-ai-ui && npm run typecheck`
  - `cd apps/everything-ai-ui && npm run build`
- **Executor:** Hermes should execute.

## 6) Update the release checklist after Phase 8.3 work
- **Why it matters:** Closeout documentation should match the current state of the validated MVP and next-phase backlog.
- **Files likely involved:**
  - `docs/ROADMAP.md`
  - `docs/IMPLEMENTATION_ROADMAP.md`
  - release/checklist docs under `docs/`
- **Acceptance criteria:**
  - Phase 8.3 closeout is reflected clearly.
  - Next priorities are visible and actionable.
  - No production code behavior changes.
- **Validation commands:**
  - `node scripts/framework-doctor.mjs`
  - documentation review only
- **Executor:** ChatGPT can draft; Hermes can execute if repo edits are required.

## Priority summary
1. Codex setup/testing
2. Claude Code setup/testing
3. Frontend modularization / cleanup
4. API key lifecycle UX
5. Rich citation/source highlighting
6. Release checklist update

## Recommended first assignment
Start with **Controlled connector-specific setup/testing for installed Codex**.

It is the highest-priority remaining Phase 8.3 item and the clearest next step after the connector gate was cleared.
