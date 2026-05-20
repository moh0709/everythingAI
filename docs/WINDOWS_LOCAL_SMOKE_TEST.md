# WINDOWS LOCAL SMOKE TEST

Date: 2026-05-21

## Purpose

Use this checklist to verify that the current EverythingAI local MVP works on a Windows machine through the official safe user UI.

This smoke test is intentionally focused on runtime behavior, not another refactor pass.

Official local MVP surfaces:

```text
services/api                       Backend API, SQLite persistence, indexing, extraction, search, Wiki/evidence routes, Ask workflows
apps/everything-ai-ui              React frontend
http://127.0.0.1:4100              Backend API
http://localhost:5151              Official safe user UI
http://localhost:5152/admin.html   Admin/operator UI during local development
```

## Current smoke-test rule

Do not broadly rewrite `apps/everything-ai-ui/src/UserApp.tsx` as part of this smoke test.

At this milestone:

- `UserApp.tsx` remains the official user-facing orchestration layer.
- `buildKnowledgeWorkspace()` intentionally remains visible in `UserApp.tsx`.
- `useAskWorkflows.ts` exists but does not need to be forced into `UserApp.tsx` before runtime validation.
- UX changes and workflow refactors must not be mixed with smoke-test fixes.

## Prerequisites

From PowerShell:

```powershell
git --version
node -v
npm -v
```

Recommended Node version: Node.js 20 LTS or newer.

## 1. Clone or update repository

If the repository does not exist locally yet:

```powershell
cd E:\01PROJEKTER
git clone https://github.com/moh0709/everythingAI.git EverythingAI
cd E:\01PROJEKTER\EverythingAI
```

If the repository already exists:

```powershell
cd E:\01PROJEKTER\EverythingAI
git pull origin main
```

If Git reports a dubious ownership error, run:

```powershell
git config --global --add safe.directory E:\01PROJEKTER\EverythingAI
```

## 2. Create a safe test folder

Do not test on the full drive or on a large production folder first.

```powershell
mkdir E:\01PROJEKTER\EverythingAI-test-files
Set-Content E:\01PROJEKTER\EverythingAI-test-files\invoice-test.txt "Invoice 123 from Supplier Alpha for project Gamma. Payment terms are 30 days."
Set-Content E:\01PROJEKTER\EverythingAI-test-files\contract-test.md "# Contract`nSupplier Alpha renewal terms and payment conditions for project Gamma."
Set-Content E:\01PROJEKTER\EverythingAI-test-files\notes-test.csv "name,value`nalpha,42"
```

## 3. Start the full local debug stack

The preferred current startup path is the root debug script:

```powershell
cd E:\01PROJEKTER\EverythingAI
.\start_all_debug.bat
```

The script validates/builds the UI, then starts:

```text
Backend API: http://127.0.0.1:4100
User UI:     http://localhost:5151
Admin UI:    http://localhost:5152/admin.html
```

Expected result:

- backend dev window opens without startup errors
- user UI dev window opens without startup errors
- admin UI dev window opens without startup errors
- `npm run typecheck` passes
- `npm run build` passes

If startup fails, copy the full failing terminal output before changing code.

## 4. Optional backend baseline validation

Run this when backend behavior is suspected or before declaring a release-grade smoke pass:

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

Expected result from the last documented baseline:

```text
80 tests / 80 passed / 0 failed
```

Do not claim a new backend validation result unless this command was actually rerun.

## 5. Open the official user UI

Open:

```text
http://localhost:5151
```

Verify:

- Start page renders correctly.
- Local settings guidance is visible and understandable.
- Backend URL/token/folder settings are visible where expected.
- No browser console errors appear on first load.

## 6. Configure local connection settings

Use the local backend URL:

```text
http://127.0.0.1:4100
```

Use the local development token shown by the app/backend configuration.

For the folder path, use only the safe test folder:

```text
E:\01PROJEKTER\EverythingAI-test-files
```

Save the connection/settings from the Start page.

Expected result:

- settings persist in the browser
- no error toast appears
- UI remains responsive

## 7. Build the local knowledge workspace from the UI

From the official user UI:

1. Select or enter the safe test folder.
2. Start the build knowledge workspace flow.
3. Watch setup progress.
4. Let the build finish before navigating away.

Expected result:

- folder indexing starts
- extraction runs
- insights/classification run where supported
- Wiki/workspace data loads after build
- status messages are clear
- no repeated noisy success toasts from polling/GET requests
- no browser console errors

If this fails, record:

- exact UI step
- visible error message
- backend terminal output
- browser console output

## 8. Verify Explore view

Open the Explore view.

Verify:

- indexed files are listed
- search for `supplier` returns the safe test documents
- selecting `invoice-test.txt` or `contract-test.md` loads document context
- source/file metadata is readable
- reveal/open source actions do not break the UI
- no browser console errors appear

## 9. Verify Wiki view

Open the Wiki view.

Verify:

- Wiki pages load
- page navigation works
- article content prioritizes real document content over metadata
- page-level search works
- reading mode works
- `[[Related Page]]` navigation works if related pages are present
- source rail renders supporting files
- source cards show path/context/evidence details
- citation badges such as `[S1:C3]` are clickable when present
- clicking a citation highlights or scrolls to the matching source/chunk
- source preview drawer opens and remains usable on the current screen width
- table/image rendering does not break article layout
- no browser console errors appear

## 10. Verify Ask view

Open the Ask view.

Ask a grounded question such as:

```text
What does the Supplier Alpha contract say about payment terms?
```

Expected result:

- Ask submits successfully
- answer is grounded in indexed source material
- source references are shown when available
- chat input clears/focuses correctly after submit
- no duplicate user/assistant messages are created
- no browser console errors appear

If provider-based chat is not configured, record whether the fallback/error message is understandable and non-breaking.

## 11. Verify cross-view workflows

From Wiki or Explore:

- ask about the selected Wiki page or document if the UI action exists
- open a Wiki page from a related-page link
- move between Start, Explore, Wiki, and Ask

Expected result:

- navigation keeps the app stable
- selected file/page state behaves predictably
- no stale state causes incorrect source details
- no browser console errors appear

## 12. Verify safe action boundaries only inside the test folder

Only test move/rename previews inside:

```text
E:\01PROJEKTER\EverythingAI-test-files
```

Verify:

- destructive delete actions remain disabled or unavailable
- move/rename requires preview
- execution requires explicit approval
- unsafe paths are blocked
- failed execution attempts are audited
- undo restores moved/renamed files when tested

Do not run action execution against personal, production, or system folders during smoke testing.

## 13. Optional CLI sanity checks

These checks are secondary. The current milestone is the official user UI runtime test.

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm run index -- "E:\01PROJEKTER\EverythingAI-test-files"
npm run extract
npm run search -- "supplier"
npm run embeddings
npm run semantic -- "supplier payment terms"
npm run insights -- --limit 10
```

Expected result:

- indexed files count is greater than zero
- extraction finds supported text
- search returns the test documents
- semantic-style search returns relevant files with score above zero
- insights complete without crashing

## 14. Optional watcher test

Use only the safe test folder:

```powershell
cd E:\01PROJEKTER\EverythingAI\services\api
npm run watch -- "E:\01PROJEKTER\EverythingAI-test-files"
```

In another PowerShell window:

```powershell
Set-Content E:\01PROJEKTER\EverythingAI-test-files\watch-test.txt "Watcher test supplier document"
```

Expected result:

- file is indexed after debounce delay
- watcher does not start overlapping rescans
- queued pending rerun behavior does not overload the app

Stop the watcher with:

```text
Ctrl+C
```

## 15. Smoke-test pass criteria

The Windows local MVP smoke test can be marked as passed only when:

- frontend typecheck passes
- frontend production build passes
- backend starts successfully
- official user UI opens at `http://localhost:5151`
- safe folder can be indexed from the UI
- Explore loads files and document context
- Wiki loads pages, citations, source rail, and source preview drawer
- Ask can submit a grounded question or show a clear non-breaking provider/configuration message
- browser console has no blocking errors
- no unsafe file action is allowed without preview and approval

## 16. Smoke-test result template

Use this template when recording the result:

```text
Date:
Machine:
Branch:
Commit SHA:
Backend command:
Frontend command:
Safe test folder:

Frontend typecheck:
Frontend build:
Backend tests, if run:

Start page:
Build knowledge workspace:
Explore:
Wiki:
Ask:
Safe actions:
Watcher, if run:
Console errors:
Backend errors:

Result: PASS / PARTIAL / FAIL
Notes:
```

## Final rule

Do not claim runtime validation beyond what was actually tested on the Windows machine.