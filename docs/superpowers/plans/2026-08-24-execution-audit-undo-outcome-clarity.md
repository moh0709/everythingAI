# Execution, Audit, and Undo Outcome Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make governed execution outcomes, persisted audit evidence, and undo/recovery availability easier to understand in the Admin Analytics view without changing backend behavior.

**Architecture:** Keep the existing `/api/action-executions` and `/api/audit-log` contracts unchanged. Derive presentation-only execution labels and matching audit rows in `AnalyticsView.tsx` from persisted fields already returned by those APIs. Add a focused Playwright acceptance before production changes, then gate it in CI.

**Tech Stack:** React + TypeScript, Playwright, existing EverythingAI API and CI workflow.

**Spec:** GitHub issue #158 — Product Depth: execution, audit, and undo outcome clarity.

## Global Constraints

- Accepted base: #156 / PR #157 merge `d8152d2307b63917e5580d01690119b24c88ccf0` after CI #557.
- No backend/API/schema/persistence changes.
- No execution-permission, approval, filesystem-mutation, audit-creation, or undo/rollback semantic changes.
- Use only persisted execution/audit fields already returned by current APIs.
- Preserve explicit confirmation before undo.
- Preserve the full inherited Phase 1 + Phase 2 + Product Depth regression matrix.

---

### Task 1: Add failing execution-outcome acceptance

**Files:**
- Create: `apps/everything-ai-ui/smoke/execution-audit-undo-outcomes.spec.ts`
- Modify later: `.github/workflows/ci-smoke.yml`

**Interfaces:**
- Consumes: `AnalyticsView` and existing Admin Analytics navigation.
- Produces: acceptance contract for execution labels, timestamps, matching audit evidence, recovery availability, failed-error visibility, and narrow viewport integrity.

- [ ] **Step 1: Write the failing Playwright acceptance**

Route existing action-execution and audit-log GET requests to deterministic persisted fixtures containing one `executed`, one `undone`, and one `failed` execution plus matching `action_execution` audit events. Assert the UI exposes human-readable outcome labels while retaining exact persisted statuses, timestamps, matching audit event types, explicit undo availability, restored state, and failure reason.

- [ ] **Step 2: Verify RED in CI**

Open a draft PR with the test-only candidate and confirm the focused acceptance fails because the current Analytics UI lacks the required outcome/audit presentation.

### Task 2: Implement minimal presentation-only outcome clarity

**Files:**
- Modify: `apps/everything-ai-ui/src/admin/components/AnalyticsView.tsx`
- Modify: `apps/everything-ai-ui/src/shared/sourceLifecycle.css` only if a shared horizontal-scroll wrapper is needed; otherwise avoid stylesheet expansion.

**Interfaces:**
- Consumes: `ActionExecution` persisted fields and `AuditEvent` rows already supplied to `AnalyticsView`.
- Produces: truthful status labels, timestamps, matched audit evidence, failed error display, and explicit recovery state without changing any API call or mutation contract.

- [ ] **Step 1: Extend local execution type with existing persisted fields**

Add `execution_batch_id`, `error_message`, and existing undo timestamp fields only; do not invent new backend fields.

- [ ] **Step 2: Add pure presentation helpers**

Create deterministic helpers for human-readable outcome label/copy and matching audit events using `entity_type === 'action_execution' && entity_id === execution.id`.

- [ ] **Step 3: Render outcome and audit evidence**

Keep Source/Target values, add executed/undone timestamps, show exact persisted status as technical metadata, list matched audit event types/times, surface `error_message` for failed executions, and explain recovery availability.

- [ ] **Step 4: Preserve explicit undo approval**

Reuse the existing `undoExecution()` confirmation and POST request unchanged; only surrounding copy may improve.

- [ ] **Step 5: Verify GREEN**

The focused Playwright acceptance must pass without changing its assertions.

### Task 3: Gate and release

**Files:**
- Modify: `.github/workflows/ci-smoke.yml`

**Interfaces:**
- Consumes: focused acceptance from Task 1.
- Produces: inherited CI matrix plus execution/audit/undo-outcome acceptance.

- [ ] **Step 1: Add focused acceptance to CI after planning-preview acceptance**

Run `npx playwright test smoke/execution-audit-undo-outcomes.spec.ts` using the existing configured smoke environment.

- [ ] **Step 2: Run unchanged-head full CI**

Require root regression, backend tests, frontend typecheck/build, all inherited browser acceptances, new outcome acceptance, disposable-folder RC, and UI-governed action/undo acceptance.

- [ ] **Step 3: Independent diff review**

Reject any change that alters backend contracts or weakens undo approval/mutation safety. Fix all Critical/Important findings before merge.

- [ ] **Step 4: Accept or reject #158**

Merge and close only after final CI passes and review is clean. Rollback is the single #158 milestone merge.
