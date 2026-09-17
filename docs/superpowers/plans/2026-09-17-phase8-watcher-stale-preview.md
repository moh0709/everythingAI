# Phase 8 Watcher Stale Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing EverythingAI folder watcher with deterministic archive stale-state detection and preview-only update/rebuild candidates, without granting watcher-driven execution or overwrite authority.

**Architecture:** Reuse `services/api/src/watcher/watchService.js` as the only watcher runtime. Add a pure archive stale-state evaluator and a narrow watcher-to-archive adapter that consumes watcher/source-change evidence and produces immutable review candidates. The adapter may call preview-only planning logic but must never call the archive executor or metadata sidecar writer.

**Tech Stack:** Node.js 22, ES modules, `node:test`, existing SQLite/watcher/archive modules, React/TypeScript Admin UI in later tasks.

**Spec:** `docs/AI_ORGANIZATION_WORKSPACE_DESIGN.md`

## Global Constraints

- Source folder remains read-only intake.
- Organized archive remains generated copy / managed output.
- Originals remain untouched unless separately explicitly authorized.
- Actions remain preview-first with approval before execution.
- Watcher integration must not overwrite archive files.
- Stale states are exactly: `current`, `source_changed`, `archive_missing`, `archive_changed`, `sidecar_missing`, `conflict`.
- No automatic approval or automatic archive execution.
- No source delete/move/rename.
- No full-drive watch enablement by default.
- Preserve existing watcher/indexing behavior and local compatibility.
- Every changed candidate must pass applicable inherited CI on one unchanged head.

---

### Task 1: Pure archive stale-state evaluator

**Files:**
- Create: `services/api/src/archive/archiveStaleState.js`
- Test: `services/api/test/archiveStaleState.test.js`

**Interfaces:**
- Consumes: last accepted execution evidence containing source/archive fingerprints and expected archive/sidecar paths, plus current observed source/archive/sidecar evidence.
- Produces: `evaluateArchiveStaleState(input)` returning a frozen object with `{ state, reason, preview_required, manual_review_required, filesystem_mutation_allowed }`.

- [ ] **Step 1: Write failing tests**

Cover all six states and precedence:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateArchiveStaleState } from '../src/archive/archiveStaleState.js';

test('returns source_changed when current source fingerprint differs from accepted execution', () => {
  const result = evaluateArchiveStaleState({
    execution: {
      source_fingerprint: { hash: 'sha256:a', size_bytes: 10, mtime_ms: 1 },
      archive_fingerprint: { hash: 'sha256:x', size_bytes: 10, mtime_ms: 1 },
      archive_path: '/archive/a.pdf',
      sidecar_path: '/archive/a.pdf.everythingai.json',
    },
    current: {
      source_exists: true,
      source_fingerprint: { hash: 'sha256:b', size_bytes: 11, mtime_ms: 2 },
      archive_exists: true,
      archive_fingerprint: { hash: 'sha256:x', size_bytes: 10, mtime_ms: 1 },
      sidecar_exists: true,
      destination_conflict: false,
    },
  });
  assert.equal(result.state, 'source_changed');
  assert.equal(result.preview_required, true);
  assert.equal(result.filesystem_mutation_allowed, false);
});
```

Additional tests must prove:
- `conflict` wins over other states and requires manual review.
- missing archive => `archive_missing` + rebuild preview.
- changed archive fingerprint => `archive_changed` + manual review.
- missing sidecar => `sidecar_missing` + sidecar regeneration preview.
- equal fingerprints and all expected outputs present => `current`.
- invalid/missing accepted execution evidence throws `INVALID_ARCHIVE_EXECUTION_EVIDENCE`.

- [ ] **Step 2: Run test to verify RED**

Run: `cd services/api && node --test test/archiveStaleState.test.js`
Expected: FAIL because `archiveStaleState.js` does not exist.

- [ ] **Step 3: Implement minimal pure evaluator**

Use exact deterministic precedence:

```text
conflict
archive_missing
archive_changed
source_changed
sidecar_missing
current
```

Fingerprint equality must compare `hash`, `size_bytes`, and `mtime_ms`. Return frozen output and always set `filesystem_mutation_allowed: false`.

- [ ] **Step 4: Run focused test**

Run: `cd services/api && node --test test/archiveStaleState.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Phase 8.1: add archive stale-state evaluator`.

---

### Task 2: Watcher event normalization and dedupe adapter

**Files:**
- Create: `services/api/src/archive/archiveWatchAdapter.js`
- Test: `services/api/test/archiveWatchAdapter.test.js`

**Interfaces:**
- Consumes: watcher event evidence `{ profile, source_path, source_fingerprint, prior_execution, observed_archive }`.
- Produces: `buildArchiveWatchReviewCandidate(input)` returning immutable review evidence with stable `candidate_id`, stale state, source evidence, prior execution linkage, and `execution_allowed: false`.

- [ ] **Step 1: Write failing tests**

Tests must prove:
- same normalized event + same fingerprints => same stable candidate ID;
- duplicate watcher events do not change semantic output;
- source outside profile roots fails closed;
- disabled profile root (`watch_enabled: false`) returns `ignored: true` and no preview;
- `source_changed`, `archive_missing`, and `sidecar_missing` produce review candidates;
- `archive_changed` and `conflict` produce manual-review candidates;
- candidate never exposes execute/approval authority.

- [ ] **Step 2: Run RED test**

Run: `cd services/api && node --test test/archiveWatchAdapter.test.js`
Expected: FAIL because adapter does not exist.

- [ ] **Step 3: Implement adapter**

Reuse `validateArchiveProfile()` and `evaluateArchiveStaleState()`. Stable candidate IDs must hash normalized semantic input, not event timestamps.

- [ ] **Step 4: Run focused tests**

Run: `cd services/api && node --test test/archiveStaleState.test.js test/archiveWatchAdapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Phase 8.2: add watcher archive review adapter`.

---

### Task 3: Existing watcher integration hook without execution authority

**Files:**
- Modify: `services/api/src/watcher/watchService.js`
- Test: `services/api/test/watcherArchiveIntegration.test.js`

**Interfaces:**
- Add optional injected callback `onArchiveWatchCycle` to watcher cycle/start functions.
- Callback receives post-scan watcher evidence only after a successful watcher scan/knowledge cycle.
- Callback result may be stored in watcher job result as review metadata; it must not influence archive execution.

- [ ] **Step 1: Write failing integration tests**

Tests must prove:
- existing watcher behavior remains unchanged when callback omitted;
- callback is invoked only after successful scan cycle;
- callback receives root/cycle evidence, never executor handles;
- callback error is surfaced as integration evidence without triggering archive mutation;
- duplicate scheduling remains handled by existing debounce/pending logic.

- [ ] **Step 2: Run RED test**

Run: `cd services/api && node --test test/watcherArchiveIntegration.test.js`
Expected: FAIL because callback contract is absent.

- [ ] **Step 3: Add the minimal injection point**

Do not import `archiveExecutor.js` or `metadataSidecar.js` from `watchService.js`. Preserve all current scan/index/knowledge logic.

- [ ] **Step 4: Run watcher + archive focused tests**

Run: `cd services/api && node --test test/archiveStaleState.test.js test/archiveWatchAdapter.test.js test/watcherArchiveIntegration.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Phase 8.3: expose safe watcher archive integration hook`.

---

### Task 4: Preview-only update/rebuild planning bridge

**Files:**
- Create: `services/api/src/archive/archiveUpdatePreview.js`
- Test: `services/api/test/archiveUpdatePreview.test.js`
- Modify only if necessary: `services/api/src/archive/archivePlanner.js`

**Interfaces:**
- Consumes: Phase 8 watch review candidate + archive profile + current source snapshot.
- Produces: preview-only update/rebuild proposal with `requires_approval: true` and `filesystem_mutation_allowed: false`.

- [ ] **Step 1: Write failing tests**

Prove:
- `source_changed` => update preview;
- `archive_missing` => rebuild preview;
- `sidecar_missing` => sidecar regeneration preview only;
- `archive_changed` and `conflict` never produce executable preview;
- all proposals remain approval-required and no-mutation;
- source fingerprint is rebound into the preview so stale approval cannot execute later.

- [ ] **Step 2: Run RED test**

Run: `cd services/api && node --test test/archiveUpdatePreview.test.js`
Expected: FAIL because preview bridge does not exist.

- [ ] **Step 3: Implement minimal bridge**

Reuse existing `createPreviewArchivePlan()` where applicable. Do not call `archiveExecutor.js`.

- [ ] **Step 4: Run focused archive tests**

Run: `cd services/api && node --test test/archiveProfileModel.test.js test/archivePlanner.test.js test/archiveExecutor.test.js test/metadataSidecar.test.js test/archiveStaleState.test.js test/archiveWatchAdapter.test.js test/watcherArchiveIntegration.test.js test/archiveUpdatePreview.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Phase 8.4: add watcher update-preview bridge`.

---

### Task 5: Admin stale/rebuild/conflict visibility

**Files:**
- Modify: `apps/everything-ai-ui/src/admin/archiveReviewModel.ts`
- Modify: `apps/everything-ai-ui/src/admin/components/ArchiveReviewWorkspace.tsx`
- Add/extend root pure-model test coverage using existing test conventions.

**Interfaces:**
- Consumes: review candidates with stale state and preview/manual-review status.
- Produces: explicit operator visibility for `source_changed`, `archive_missing`, `archive_changed`, `sidecar_missing`, and `conflict` without adding execution controls.

- [ ] **Step 1: Add failing model tests** proving stale filtering/counts and blocked approval for manual-review states.
- [ ] **Step 2: Verify RED** with the repository's existing root model-test command.
- [ ] **Step 3: Implement minimal model/UI changes**; preserve `Approval here records intent only` and `No execute/run action exists` semantics.
- [ ] **Step 4: Run frontend typecheck/build and focused model tests**.
- [ ] **Step 5: Commit** as `Phase 8.5: surface archive stale review states`.

---

### Task 6: Phase 8 qualification and closure

**Files:**
- Create: `scripts/validate-phase8-watcher-integration.mjs`
- Create: `.github/workflows/ci-phase8-watcher-integration.yml`
- Create: Phase 8 release-decision and handover docs.
- Later canonical sync: `PROJECT_STATE.md`, `AI_BOOTSTRAP.md`, `docs/ROADMAP.md`, `docs/IMPLEMENTATION_ROADMAP.md`.

**Interfaces:**
- Qualification must prove watcher integration remains preview-only/manual-approval and no-overwrite/no-delete.

- [ ] **Step 1:** Add closure validator checking required implementation/test files and forbidden watcher imports/calls to executor/sidecar write authority.
- [ ] **Step 2:** Add dedicated CI workflow running focused Phase 8 tests plus frontend typecheck/build.
- [ ] **Step 3:** Run complete applicable inherited matrix on one unchanged candidate head.
- [ ] **Step 4:** Merge only with clean reviews/threads and all applicable checks green.
- [ ] **Step 5:** Perform separate canonical acceptance synchronization and validate again before marking `PHASE8_WATCHER_STALE_PREVIEW_PASS`.

## Self-review

- Spec coverage: Stage 7 stale states, update-preview flow, no overwrite, audit/recovery/idempotency qualification are mapped above.
- No placeholders remain.
- Interface names are stable across tasks: `evaluateArchiveStaleState`, `buildArchiveWatchReviewCandidate`, optional `onArchiveWatchCycle`, and preview-only bridge.
- Phase 8 does not include Stage 8 AI enrichment or Stage 9 advanced document intelligence.
