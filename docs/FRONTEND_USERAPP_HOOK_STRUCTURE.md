# Frontend UserApp Hook Structure

Date: 2026-05-20

## Purpose

This document explains the current frontend controller structure for the local EverythingAI user MVP.

The official user UI entry/controller is:

```text
apps/everything-ai-ui/src/UserApp.tsx
```

The refactor goal is to keep `UserApp.tsx` as a thin orchestration layer while moving reusable state and focused workflow logic into smaller hooks under:

```text
apps/everything-ai-ui/src/user/
```

## Current extracted hooks

### Connection and local settings

```text
apps/everything-ai-ui/src/user/useConnectionSettings.ts
```

Owns:

- `baseUrl`
- `token`
- `folderPath`
- derived API `options`
- browser-local persistence for connection settings

### Setup progress

```text
apps/everything-ai-ui/src/user/useSetupProgress.ts
```

Owns:

- setup step state
- setup progress updates through `markStep()`

### Shared action runner

```text
apps/everything-ai-ui/src/user/useUserActionRunner.ts
```

Owns:

- `status`
- `error`
- `busy`
- shared `run(label, task)` wrapper

This keeps status/error/busy behavior consistent across the user UI.

### Wiki state

```text
apps/everything-ai-ui/src/user/useWikiState.ts
```

Owns:

- Wiki payload state
- selected Wiki page ID
- selected Wiki page derivation
- reading mode state
- active source reference state
- source card refs
- Wiki page selection helper
- citation highlight/scroll helper

### File/document state

```text
apps/everything-ai-ui/src/user/useFileDocumentState.ts
```

Owns:

- indexed files state
- selected file ID
- selected file derivation
- document context state
- file-list loading helper
- file-selection helper

### Ask/chat state

```text
apps/everything-ai-ui/src/user/useAskState.ts
```

Owns:

- chat input state
- chat message state
- chat input ref
- chat input clearing
- message append helpers
- chat input focus helper
- chat submit handler

### File/document workflows

```text
apps/everything-ai-ui/src/user/useFileDocumentWorkflows.ts
```

Owns:

- `refreshFiles()`
- `searchEverything()`
- `loadDocumentContext()`
- `revealSourceFile()`

These workflows are extracted from `UserApp.tsx` and validated with frontend typecheck/build.

### Wiki workflows

```text
apps/everything-ai-ui/src/user/useWikiWorkflows.ts
```

Owns:

- `refreshWiki()`
- `buildWiki()`

These workflows are extracted from `UserApp.tsx` and validated with frontend typecheck/build.

### Ask workflow foundation

```text
apps/everything-ai-ui/src/user/useAskWorkflows.ts
```

Currently exists as a prepared hook for the Ask API workflow.

At this milestone, `askQuestion()` still remains in `UserApp.tsx` because one full controller wiring patch was blocked by connector safety checks. The current application state is validated and stable, so this should not be forced unless there is a clear need.

## What intentionally remains in UserApp.tsx

`UserApp.tsx` still owns the cross-view orchestration layer:

- active `view`
- global search `query`
- top-level navigation
- `saveConnection()` wrapper
- `selectFolder()`
- `buildKnowledgeWorkspace()`
- `askQuestion()` for now
- `askAboutWikiPage()`
- `openWikiPage()` cross-view wrapper
- `openAskView()`
- `handleAskFromHero()`

## Why buildKnowledgeWorkspace remains in UserApp.tsx

`buildKnowledgeWorkspace()` is the central onboarding workflow. It coordinates:

- selected local folder
- indexing
- extraction
- insights
- Wiki loading
- file loading
- document context loading
- setup progress
- view navigation
- user-facing status messages

Because it touches many system areas, it should remain visible in `UserApp.tsx` until the MVP has completed broader local smoke testing.

## Validation commands

After changing any frontend hook or `UserApp.tsx`, run:

```text
cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

Expected result:

```text
npm run typecheck: passed
npm run build: passed
```

## Refactor policy

Continue only with small, controlled refactor batches.

Recommended order for future changes:

1. Keep `buildKnowledgeWorkspace()` visible until MVP smoke tests are complete.
2. Only wire `useAskWorkflows.ts` if the connector accepts a small, safe patch.
3. Do not combine workflow extraction with UX changes in the same commit.
4. Validate with typecheck/build after each batch.
5. Prefer dedicated validation notes in `docs/` when the large MVP plan file is risky to update.
