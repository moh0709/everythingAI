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

## 2. Create safe test folder

Do not test on the full C: drive first.

```powershell
mkdir C:\AI\everythingAI-test-files
Set-Content C:\AI\everythingAI-test-files\invoice-test.txt "Invoice 123 from Supplier Alpha for project Gamma"
Set-Content C:\AI\everythingAI-test-files\contract-test.md "# Contract\nSupplier Alpha renewal terms and payment conditions"
Set-Content C:\AI\everythingAI-test-files\notes-test.csv "name,value`nalpha,42"
```

## 3. Run tests

```powershell
npm test
```

Expected:

```text
All tests pass.
```

## 4. Start local API/UI

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

## 5. Index test folder from CLI

In another PowerShell window:

```powershell
cd C:\AI\everythingAI\services\api
npm run index -- "C:\AI\everythingAI-test-files"
```

Expected:

```text
indexed > 0
failed = 0
```

## 6. Extract text

```powershell
npm run extract
```

Expected:

```text
extracted > 0
```

## 7. Search

```powershell
npm run search -- "supplier"
```

Expected:

```text
contract-test.md or invoice-test.txt appears in results.
```

## 8. Generate embeddings and semantic search

```powershell
npm run embeddings
npm run semantic -- "supplier payment terms"
```

Expected:

```text
Relevant files appear with score above 0.
```

## 9. Generate insights

```powershell
npm run insights -- --limit 10
```

Expected:

```text
Files get classification and summary.
```

## 10. Organization preview flow

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

## 11. Execute only after approval

Only run this inside the safe test folder.

```powershell
npm run execute -- "<preview-id>" --approve
```

Expected:

```text
Action executes only when --approve is present.
```

## 12. Undo approved action

```powershell
npm run undo -- "<execution-id>" --approve
```

Expected:

```text
Moved/renamed file is restored and audit log contains action.undone.
```

## 13. Check dashboard

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

## 14. Check audit log

```powershell
curl -H "Authorization: Bearer replace-with-your-local-development-token" http://127.0.0.1:4100/api/audit-log
```

Expected:

```text
Executed and undone actions are listed after running action tests.
```

## Safety reminders

- Do not scan `C:\` initially.
- Do not scan system folders.
- Do not scan production folders until smoke test passes.
- Delete actions are not implemented and should stay disabled.
- Move/rename actions must only run after preview and explicit approval.
