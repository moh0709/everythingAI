# WINDOWS LOCAL SMOKE TEST

## Purpose

Use this checklist to verify that the EverythingAI local MVP works on a Windows machine.

## Prerequisites

From PowerShell:

```powershell
git --version
node -v
npm -v
```

Recommended Node version: Node.js 20 LTS or newer.

## 1. Clone repository

```powershell
cd C:\AI
git clone https://github.com/moh0709/everythingAI.git
cd C:\AI\everythingAI\services\api
npm install
```

## 2. Set local MVP safety/optimization variables

```powershell
$env:EVERYTHINGAI_MAX_FILE_SIZE_BYTES="262144000"
$env:EVERYTHINGAI_EXCLUDE_NAMES="node_modules,.git,dist,build"
$env:EVERYTHINGAI_EXCLUDE_EXTENSIONS=".exe,.dll,.iso,.zip"
$env:EVERYTHINGAI_WATCH_DEBOUNCE_MS="1000"
```

Optional Ollama setup:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen3.5:2b"
$env:OLLAMA_TIMEOUT_MS="120000"
$env:OLLAMA_NUM_PREDICT="192"
```

## 3. Create safe test folder

Do not test on the full C: drive first.

```powershell
mkdir C:\AI\everythingAI-test-files
Set-Content C:\AI\everythingAI-test-files\invoice-test.txt "Invoice 123 from Supplier Alpha for project Gamma"
Set-Content C:\AI\everythingAI-test-files\contract-test.md "# Contract\nSupplier Alpha renewal terms and payment conditions"
Set-Content C:\AI\everythingAI-test-files\notes-test.csv "name,value`nalpha,42"
```

## 4. Run tests

```powershell
npm test
```

Expected:

```text
All tests pass.
```

If tests fail, copy the full output before continuing.

## 5. Start local API/UI

```powershell
npm start
```

Open:

```text
http://127.0.0.1:4100
```

Default local token:

```text
replace-with-your-local-development-token
```

## 6. Index test folder from CLI

In another PowerShell window:

```powershell
cd C:\AI\everythingAI\services\api
npm run index -- "C:\AI\everythingAI-test-files"
```

Expected:

```text
indexed > 0
failed = 0
skipped reasons are visible if files/folders are excluded
```

## 7. Extract text

```powershell
npm run extract
```

Expected:

```text
extracted > 0
skipped_unchanged may appear on later repeated runs
```

## 8. Search

```powershell
npm run search -- "supplier"
```

Expected:

```text
contract-test.md or invoice-test.txt appears in results.
```

## 9. Generate embeddings and semantic search

```powershell
npm run embeddings
npm run semantic -- "supplier payment terms"
```

Expected:

```text
Relevant files appear with score above 0.
```

Note: current MVP embeddings are deterministic local token embeddings, not neural embeddings yet.

## 10. Generate insights

```powershell
npm run insights -- --limit 10
```

Expected:

```text
Files get classification and summary.
```

## 11. Organization preview flow

List files:

```powershell
npm run files:list -- --limit 20
```

Copy a file ID, then:

```powershell
npm run suggest -- "<file-id>"
```

Copy a suggestion ID, then:

```powershell
npm run preview -- "<suggestion-id>"
```

Expected:

```text
Preview is created. It may be ready or blocked depending on conflict checks.
```

## 12. Execute only after approval

Only run this inside the safe test folder.

```powershell
npm run execute -- "<preview-id>" --approve
```

Expected:

```text
Action executes only when --approve is present.
```

Execution validates:

- safe preview exists
- source path exists
- target path does not exist
- source and target are different
- target does not escape the allowed directory boundary

Failed execution attempts are audited.

## 13. Undo approved action

```powershell
npm run undo -- "<execution-id>" --approve
```

Expected:

```text
Moved/renamed file is restored and audit log contains action.undone.
```

## 14. Test watcher carefully

Use only the safe test folder:

```powershell
npm run watch -- "C:\AI\everythingAI-test-files"
```

In another PowerShell window:

```powershell
Set-Content C:\AI\everythingAI-test-files\watch-test.txt "Watcher test supplier document"
```

Expected:

```text
File is indexed after debounce delay.
The watcher does not start overlapping rescans.
```

Stop the watcher with:

```text
Ctrl+C
```

## 15. Check dashboard

In browser:

```text
http://127.0.0.1:4100
```

Verify:

- Status metrics show files.
- Search works.
- File preview works.
- Suggestions can be created.
- Actions require confirmation.
- Errors are visible in the log area.

## 16. Check audit log

```powershell
curl -H "Authorization: Bearer replace-with-your-local-development-token" http://127.0.0.1:4100/api/audit-log
```

Expected:

```text
Executed, failed, and undone actions are listed after running action tests.
```

## 17. Check validation and dependency audit

```powershell
npm audit --omit=dev
```

Expected:

```text
No critical production dependency issues.
```

## Safety reminders

- Do not scan `C:\` initially.
- Do not scan system folders.
- Do not scan production folders until smoke test passes.
- Delete actions are not implemented and should stay disabled.
- Move/rename actions must only run after preview and explicit approval.
- Use the safe test folder until all tests pass.
