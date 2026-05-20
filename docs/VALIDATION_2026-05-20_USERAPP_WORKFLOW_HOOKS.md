# Validation Note — UserApp Workflow Hooks

Date: 2026-05-20

## Scope

This validation covers the controlled frontend refactor that extracted additional workflow logic from:

```text
apps/everything-ai-ui/src/UserApp.tsx
```

into dedicated hooks:

```text
apps/everything-ai-ui/src/user/useFileDocumentWorkflows.ts
apps/everything-ai-ui/src/user/useWikiWorkflows.ts
apps/everything-ai-ui/src/user/useAskWorkflows.ts
```

## Commits validated

```text
e5eee9c Extract file document workflow hook
0156709 Extract wiki workflow hook
1c46272 Extract ask workflow hook
faca40a Use file and wiki workflow hooks in UserApp
94d5b18 Remove unused selected file workflow parameter
b9fc3fd Allow selected file workflow compatibility option
```

## Validation commands

```text
cd E:\01PROJEKTER\EverythingAI\apps\everything-ai-ui
npm run typecheck
npm run build
```

## Result

```text
npm run typecheck: passed
npm run build: passed
```

## Notes

File/document API workflows and Wiki API workflows are now extracted and wired into `UserApp.tsx`.

The Ask workflow hook exists as `useAskWorkflows.ts`, but `askQuestion()` remains in `UserApp.tsx` at this milestone because a full controller wiring patch was blocked once by connector safety checks. The current state is validated and stable.

`selectFolder()` and `buildKnowledgeWorkspace()` intentionally remain visible in `UserApp.tsx` because they coordinate the central onboarding flow across indexing, extraction, insights, Wiki loading, file loading, setup progress, and navigation.
