# MVP UI Smoke Test Runbook

## Purpose

This runbook validates the current official browser UI surfaces for the local MVP:

```text
Client Workspace: http://localhost:5151
Admin Dashboard: http://localhost:5151/admin.html
Backend API: http://127.0.0.1:4100
```

It also records the explicit Sprint 6 checks that remain follow-up work after issue #19 re-triage.

## Safety boundary

Use only a disposable local folder. Do not run action previews, executions, undo, or recovery tests against personal, production, system, or large recursive folders.

Recommended disposable folder:

```powershell
mkdir C:\temp\EverythingAI-ui-smoke
Set-Content C:\temp\EverythingAI-ui-smoke\invoice-test.txt "Invoice 123 from Supplier Alpha for project Gamma. Payment terms are 30 days."
Set-Content C:\temp\EverythingAI-ui-smoke\contract-test.md "# Contract`nSupplier Alpha renewal terms and payment conditions for project Gamma."
```

## Automated validation

Run from the repository root:

```powershell
npm test
```

Run from the React UI:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Optional browser smoke:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts --browser=chromium
```

## Start local services

Backend:

```powershell
cd C:\temp\EverythingAI\services\api
npm run dev
```

Frontend:

```powershell
cd C:\temp\EverythingAI\apps\everything-ai-ui
npm run dev
```

Expected:

```text
Backend API responds on http://127.0.0.1:4100
Client Workspace loads on http://localhost:5151
Admin Dashboard loads on http://localhost:5151/admin.html
```

## Client Workspace checks

### Index and workspace build

1. Open `http://localhost:5151`.
2. Enter or select `C:\temp\EverythingAI-ui-smoke`.
3. Run the workspace build flow.
4. Wait for indexing, extraction, insights, file refresh, and wiki refresh to complete.

Expected:

```text
Disposable files are indexed.
Extracted text is available for supported files.
Knowledge Base pages load after build.
No blocking browser console errors appear.
```

### Search and document context

1. Open Sources & Files.
2. Search for `Supplier Alpha`.
3. Select `invoice-test.txt` or `contract-test.md`.

Expected:

```text
Search returns indexed files.
Selecting a file loads /api/intelligence/document-context/:fileId.
The details panel shows filename, path, recovery status, progress state, index status, extraction status, source reference, insight summary when available, and extracted text.
```

### Ask workflow

Ask:

```text
What are the payment terms for Supplier Alpha?
```

Expected:

```text
Ask submits from the Client Workspace.
The UI either returns a grounded answer with sources or a clear non-breaking provider/configuration message.
```

## Admin Dashboard checks

Open:

```text
http://localhost:5151/admin.html
```

Verify:

```text
Admin Dashboard loads.
Planning, Files & Content, Analytics, and Settings remain reachable.
Provider settings and agent connectors remain in Admin Dashboard, not Client Workspace.
```

## Sprint 6 gap checks

These checks are expected to be PASS only after the smaller follow-up tickets from `docs/SPRINT6_UI_WORKFLOW_PLAN.md` are implemented.

| Workflow | Current expected issue #19 status | Manual check |
|---|---|---|
| Batch create/approve/run | Follow-up needed | Admin Planning Center should eventually create a batch from ready previews, approve it, run it, and show linked executions. |
| Recovery Center restore | Follow-up needed | Admin Dashboard should eventually list trash records, show retention metadata, restore with confirmation, and explain permanent purge is disabled. |
| Undo filesystem execution | Follow-up needed | Admin Dashboard should eventually show eligible move/rename executions with an Undo button and confirmation. |
| Structured audit filters | Follow-up needed | Admin Dashboard should eventually filter `/api/audit-log` by entity type and entity ID while preserving raw diagnostics. |

## Result template

```text
Date:
Machine:
Commit SHA:
Backend:
Frontend:
Disposable folder:

npm test:
Frontend typecheck:
Frontend build:
Playwright smoke, if run:

Client Workspace load:
Index/build:
Search:
Document context:
Knowledge Base:
Ask:
Admin Dashboard:
Batch workflow:
Recovery Center:
Undo:
Audit filters:

Result: PASS / PARTIAL / FAIL
Notes:
```
