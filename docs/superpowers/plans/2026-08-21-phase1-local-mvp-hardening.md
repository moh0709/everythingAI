# Phase 1 Local MVP Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the current-commit product walkthrough, prove UTF-8 integrity, unify source-processing recovery states, and validate the governed action/undo lifecycle through the UI.

**Architecture:** Extend the existing Playwright and Node test surfaces with deterministic disposable fixtures. Keep presentation-state derivation in focused frontend utilities, preserve backend safety boundaries, and deliver each GitHub issue as an independently revertible pull request in dependency order.

**Tech Stack:** Node.js 22, React 18, TypeScript 5.5, Vite 5, Playwright 1.60, SQLite, GitHub Actions.

**Spec:** `docs/PHASE1_LOCAL_MVP_PRODUCT_REVIEW_AND_RELEASE_HARDENING_2026-08-21.md`

## Global Constraints

- Start from accepted baseline `5a09c45d685eaa84576115469d2fe082957efcc5`.
- Preserve 191/191 root tests and all backend tests.
- Require frontend typecheck, production build, Client/Admin Playwright smoke, disposable-folder RC acceptance, and CI for every production change.
- Use current-commit reproduction and failing focused tests before fixes.
- Keep Agent Connectors, provider settings, and credentials admin-only.
- Preserve source attribution and use UTF-8 end to end.
- Mutate only disposable fixture folders in browser acceptance.
- Do not expand connector runtime behavior.
- Do not modify or release protected issue #69.

---

### Task 1: Complete #110 current-commit walkthrough and classification

**Files:**
- Modify: `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts`
- Modify: `apps/everything-ai-ui/smoke/disposable-folder-acceptance.spec.ts`
- Create: `apps/everything-ai-ui/smoke/fixtures/phase1-unicode-source.txt`
- Create: `REPORTS/PHASE1_CURRENT_COMMIT_UI_WALKTHROUGH.md`

**Interfaces:**
- Consumes: `EVERYTHINGAI_API_URL`, `EVERYTHINGAI_UI_URL`, `EVERYTHINGAI_SMOKE_ARTIFACT_DIR`.
- Produces: desktop/narrow screenshots and a four-state observation table using `confirmed`, `not reproduced`, or `fixture-only`.

- [ ] **Step 1: Add the exact UTF-8 discovery fixture**

Create `apps/everything-ai-ui/smoke/fixtures/phase1-unicode-source.txt` as UTF-8 with this content:

```text
Phase 1 Unicode integrity
Dansk: Rødgrød med fløde — ÆØÅ æøå
Español: información, acción, Málaga
Deutsch: Größe, Straße, Überprüfung
Arabic: المعرفة الموثقة بالمصادر
Symbols: € — “quoted text” …
```

- [ ] **Step 2: Extend the disposable-folder setup**

Copy the fixture into the existing disposable source folder before indexing. Assert the file API returns the exact filename and extracted text without replacement characters (`\uFFFD`) or common mojibake fragments (`Ã`, `Â`, `â€`).

- [ ] **Step 3: Capture the full journey at both viewports**

In `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts`, add a reusable `for (const viewport of [{name: 'desktop', width: 1280, height: 900}, {name: 'narrow', width: 390, height: 844}])` loop. Capture Sources & Files, Knowledge Base, Ask AI, Planning, Analytics/Audit, and Agent Connectors after the relevant content is visible. After every navigation, call `assertNoHorizontalOverflow(page)`.

- [ ] **Step 4: Run the discovery tests**

Run:

```bash
cd apps/everything-ai-ui
npx playwright test smoke/client-admin-smoke.spec.ts smoke/disposable-folder-acceptance.spec.ts
```

Expected: tests either pass and classify an observation as not reproduced/fixture-only, or fail at the exact UI/API layer that confirms a defect. Preserve screenshots and traces before changing production code.

- [ ] **Step 5: Write the validation report**

Create `REPORTS/PHASE1_CURRENT_COMMIT_UI_WALKTHROUGH.md` with one row for each observation: Agent Connector layout/copy, Unicode, source-processing states, and governed action visibility. Record classification, fixture, test name, screenshot filename, CI URL, and next issue.

- [ ] **Step 6: Verify and commit the discovery gate**

Run:

```bash
node --test --test-reporter=dot tests/*.test.mjs
cd apps/everything-ai-ui && npm run typecheck
cd apps/everything-ai-ui && npm run build
```

Expected: 191 dots with exit 0, typecheck exit 0, build exit 0.

Commit exact paths:

```bash
git add -- apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts apps/everything-ai-ui/smoke/disposable-folder-acceptance.spec.ts apps/everything-ai-ui/smoke/fixtures/phase1-unicode-source.txt REPORTS/PHASE1_CURRENT_COMMIT_UI_WALKTHROUGH.md
git commit -m "test(ui): complete Phase 1 current-commit walkthrough"
```

### Task 2: Resolve #112 Knowledge Base Unicode integrity

**Files:**
- Modify if extraction is responsible: `services/api/src/extractors/documentExtractor.js`
- Modify if persistence/API is responsible: `services/api/src/db/client.js`
- Modify if rendering is responsible: `apps/everything-ai-ui/src/user/wikiMarkdown.tsx`
- Test: `services/api/test/documentExtractor.test.js`
- Test: `apps/everything-ai-ui/src/user/wikiMarkdown.test.mjs`
- Test: `apps/everything-ai-ui/smoke/disposable-folder-acceptance.spec.ts`

**Interfaces:**
- Consumes: exact UTF-8 fixture from Task 1 and persisted Wiki page/source payloads.
- Produces: byte-safe extraction/persistence/rendering with unchanged source references.

- [ ] **Step 1: Write the failing test at the responsible boundary**

Use the exact fixture strings from Task 1. Assert equality, not substring normalization. Assert rendered text contains `Rødgrød med fløde`, `información`, `Größe`, and `المعرفة`, and contains none of `\uFFFD`, `Ã`, `Â`, or `â€`.

- [ ] **Step 2: Verify RED**

Run only the responsible boundary test. Expected: FAIL showing the first altered character or fixture-only corruption. If product code is already correct, correct only the fixture and record `fixture-only`; do not add speculative conversion code.

- [ ] **Step 3: Implement the narrowest fix**

Preserve JavaScript strings as UTF-8. Do not use lossy `Buffer` round trips or heuristic re-encoding. If Markdown rendering is responsible, pass the original string through the existing renderer and escape only unsafe HTML, not Unicode characters.

- [ ] **Step 4: Verify GREEN and source attribution**

Run the focused unit test and the disposable-folder Playwright test. Assert every rendered page still exposes its source filename/reference.

- [ ] **Step 5: Run all gates and commit**

Run root tests, backend tests, frontend typecheck/build, both Playwright suites, and CI. Commit only the responsible implementation, focused tests, and #112 report paths.

### Task 3: Implement #113 source-processing lifecycle and recovery

**Files:**
- Create: `apps/everything-ai-ui/src/shared/sourceLifecycle.ts`
- Create: `apps/everything-ai-ui/src/shared/sourceLifecycle.test.mjs`
- Modify: `apps/everything-ai-ui/src/user/ExploreView.tsx`
- Modify: `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`
- Modify: `apps/everything-ai-ui/src/styles.css`
- Test: `apps/everything-ai-ui/smoke/client-admin-smoke.spec.ts`

**Interfaces:**
- Produces: `deriveSourceLifecycle(file)` returning `{ state, label, detail, recoveryAction }`.
- State union: `intake | indexing | extracting | ready | unsupported | index_failed | extraction_failed`.
- Precedence: `index_failed` > `extraction_failed` > `unsupported` > `ready` > `extracting` > `indexing` > `intake`.

- [ ] **Step 1: Write the lifecycle matrix tests**

Cover every state plus conflicting combinations. Required examples: indexed+extracted → ready; failed index+extracted → index_failed; indexed+failed extraction → extraction_failed; indexed+unsupported → unsupported; indexed+missing extraction → extracting.

- [ ] **Step 2: Verify RED**

Run `node --test apps/everything-ai-ui/src/shared/sourceLifecycle.test.mjs`. Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure derivation module**

Return deterministic copy and no side effects. `recoveryAction` is `retry_index`, `retry_extraction`, or `null`; never expose a retry value the backend cannot safely execute.

- [ ] **Step 4: Replace duplicated status presentation**

Use `deriveSourceLifecycle(file)` in `apps/everything-ai-ui/src/user/ExploreView.tsx` and `apps/everything-ai-ui/src/admin/components/ExplorerView.tsx`. Render one primary lifecycle label and a secondary technical detail rather than conflicting equal-weight chips.

- [ ] **Step 5: Add keyboard and responsive acceptance**

Assert recovery controls are native buttons, reachable by Tab, and activatable by Enter. Capture desktop and 390px screenshots and assert no horizontal overflow.

- [ ] **Step 6: Run all gates and commit**

Run lifecycle unit tests, root tests, frontend typecheck/build, Playwright suites, and CI. Commit the lifecycle module, its tests, both views, CSS, and #113 evidence.

### Task 4: Implement #114 UI-governed action and undo acceptance

**Files:**
- Modify: `apps/everything-ai-ui/smoke/disposable-folder-acceptance.spec.ts`
- Modify only if testability requires stable semantics: `apps/everything-ai-ui/src/admin/components/PlanningView.tsx`
- Modify only if testability requires stable semantics: `apps/everything-ai-ui/src/admin/components/AnalyticsView.tsx`

**Interfaces:**
- Consumes: existing suggestion, preview, approval/execution, audit, and undo APIs through visible Admin UI controls.
- Produces: a Playwright test that proves the disposable filesystem is identical before and after undo.

- [ ] **Step 1: Record the initial filesystem manifest**

Before browser interaction, record each fixture path and SHA-256 content hash. Keep the fixture root under the test-created temporary directory.

- [ ] **Step 2: Drive planning and preview through the UI**

Open Admin Planning, select exactly one deterministic rename or move suggestion, and click `Dry Run Preview`. Assert the preview displays source path, target path, and a ready/blocked status before any mutation.

- [ ] **Step 3: Prove explicit approval**

Accept the browser confirmation dialog only after asserting its action description. Verify the source filesystem remains unchanged before acceptance.

- [ ] **Step 4: Verify execution and audit**

After approval, assert the UI reports execution success. Navigate to Analytics/Audit and assert an event tied to the execution identifier and action type.

- [ ] **Step 5: Undo through the UI**

Click the visible Undo button, assert status becomes `undone`, and compare the final filesystem manifest with the initial manifest for exact equality.

- [ ] **Step 6: Preserve failure evidence and run all gates**

Use `try/finally` cleanup that preserves Playwright trace, screenshots, backend log, frontend log, and the disposable folder path on failure while deleting only the test-created folder after success. Run root tests, backend tests, frontend typecheck/build, Playwright suites, and CI.

### Task 5: Phase 1 release decision and canonical synchronization

**Files:**
- Modify: `PROJECT_STATE.md`
- Modify: `AI_BOOTSTRAP.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Create: `REPORTS/PHASE1_RELEASE_DECISION.md`
- Create: `docs/HANDOVER_2026-08-21_PHASE1_RELEASE_DECISION.json`

**Interfaces:**
- Consumes: accepted issue dispositions, merge SHAs, CI URLs, artifacts, and rollback paths from Tasks 1–4.
- Produces: one canonical Phase 1 completion decision and the next dependency-satisfied milestone.

- [ ] **Step 1: Reconcile issue state**

Confirm #110, #112, #113, and #114 are accepted completed or closed with an evidence-backed non-defect disposition. Do not close an issue from implementation claims alone.

- [ ] **Step 2: Run the unchanged final candidate**

Run the entire release matrix on one SHA: root tests, backend tests, frontend typecheck/build, Client/Admin Playwright, disposable-folder RC acceptance, and CI. Record exact counts and URLs.

- [ ] **Step 3: Synchronize canonical documents**

Update all four canonical files with the same Phase 1 status, accepted SHA, remaining production gaps, and next work. Remove no historical evidence; add a superseding dated overlay.

- [ ] **Step 4: Write release and handover artifacts**

Record scope, exclusions, issue dispositions, exact SHA, CI run, artifact names, rollback commits, known limitations, and confirmation that #69 remained unchanged.

- [ ] **Step 5: Commit the release decision**

```bash
git add -- PROJECT_STATE.md AI_BOOTSTRAP.md docs/ROADMAP.md docs/IMPLEMENTATION_ROADMAP.md REPORTS/PHASE1_RELEASE_DECISION.md docs/HANDOVER_2026-08-21_PHASE1_RELEASE_DECISION.json
git commit -m "docs: record Phase 1 release decision"
```
