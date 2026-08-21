# Phase 1 — Local MVP Product Review and Release Hardening

Date: 2026-08-21

Authority: CEO-approved continuation after Phase 0 closure

Starting baseline: `5a09c45d685eaa84576115469d2fe082957efcc5`

## Objective

Turn the accepted local MVP into a demonstrably product-reviewable release candidate by completing the current-commit walkthrough, repairing reproduced presentation and content defects, clarifying recovery states, and proving the full governed action lifecycle through the UI.

Phase 1 improves the local product and its evidence. It does not claim enterprise production readiness.

## Five-track position

| Track | Phase 1 scope | Exit evidence |
|---|---|---|
| Product and UX | Responsive Client/Admin journeys, coherent source-processing states, actionable recovery | Desktop and 390px Playwright screenshots, accessibility assertions, no horizontal overflow |
| Knowledge and Safe Action | UTF-8 integrity, source attribution, preview/approval/action/audit/undo | Deterministic fixtures, UI acceptance, restored disposable filesystem |
| Enterprise Platform | No implementation expansion in Phase 1 | Separate decision package remains future work |
| Engineering Operations | Durable browser artifacts and reproducible release gates | Backend tests, frontend typecheck/build, Playwright, RC acceptance, CI artifacts |
| Governance and Autonomous Delivery | One released dependency-satisfied task at a time | Exact SHA, issue state, rollback path, canonical docs, protected #69 unchanged |

## Accepted baseline milestone

Issue #111 is complete through PR #115 and merge commit `5a09c45d685eaa84576115469d2fe082957efcc5`.

- Agent Connector expanded content is responsive at desktop and 390px.
- Stale Phase 8.3 presentation copy was replaced with capability/readiness language.
- Successful CI runs preserve 12 current-commit screenshots.
- CI #450 passed backend tests, frontend typecheck/build, Client/Admin Playwright smoke, and disposable-folder RC acceptance.
- Root regression remained 191/191.
- Connector runtime boundaries were not expanded.

## Dependency sequence

### Milestone 1 — Complete current-commit walkthrough and classification (#110)

Run deterministic Client and Admin journeys at desktop and 390px. Classify the following as `confirmed`, `not reproduced`, or `fixture-only`:

1. Agent Connector responsiveness and stale copy — already confirmed and repaired by #111.
2. Knowledge Base Unicode/mojibake.
3. Indexing/extraction status ambiguity and recovery.
4. Planning, preview, approval, execution, audit, and undo visibility.

Exit requires screenshots, focused assertions, exact fixture data, and a validation report. This milestone discovers and classifies; it does not hide defects by changing production code during reproduction.

### Milestone 2 — Unicode rendering integrity (#112)

If #110 confirms a product defect, repair the narrowest responsible layer: extraction, persistence, API serialization, Markdown rendering, or fixture. If the defect is fixture-only, correct the fixture and add a regression that proves product UTF-8 integrity.

Exit requires representative non-ASCII text, preserved source attribution, a focused rendering assertion, screenshot evidence, and all release gates green.

### Milestone 3 — Source processing and recovery lifecycle (#113)

Define one deterministic precedence model for intake, indexing, extraction, failure, unsupported, retry, and ready states. Present a keyboard-accessible recovery action only when the backend supports a safe retry.

Exit requires unit tests for every allowed/conflicting state, desktop/narrow screenshots, recovery-path evidence, and all release gates green.

### Milestone 4 — UI-governed action and undo acceptance (#114)

Drive planning → dry-run preview → explicit approval → execution → audit → undo entirely through the Admin UI using a disposable folder. Prove the final filesystem matches the initial fixture and preserve logs on failure.

Exit requires a deterministic Playwright test, pre-mutation preview evidence, audit identity, undo evidence, restored filesystem state, and all release gates green.

### Milestone 5 — Phase 1 release decision

Synchronize `PROJECT_STATE.md`, `AI_BOOTSTRAP.md`, `docs/ROADMAP.md`, and `docs/IMPLEMENTATION_ROADMAP.md`. Record issue dispositions, exact accepted SHAs, CI URLs, screenshot/log artifacts, and rollback commands. Phase 1 completes only when #110, #112, #113, and #114 are accepted or truthfully closed with evidence-backed non-defect dispositions.

## Global constraints

- Preserve the accepted local MVP release-candidate regression matrix.
- Use failing focused tests before production fixes.
- Keep user and admin surfaces separate.
- Keep provider credentials and Agent Connectors admin-only.
- Preserve source attribution through every content-rendering change.
- Use only disposable fixtures for file mutations.
- Do not enable connector chat or expand connector runtime behavior.
- Do not modify or release protected issue #69 without explicit CEO authorization.
- Do not begin Enterprise Platform implementation within this phase.
- Every milestone must record a rollback path and truthful `BLOCKED` outcome when evidence is insufficient.

## Phase 1 definition of done

1. #110 current-commit walkthrough and observation classification is accepted.
2. #112 Unicode integrity is proven and any reproduced defect is fixed.
3. #113 processing/recovery lifecycle is coherent and tested.
4. #114 UI-governed action/undo acceptance passes with a restored disposable filesystem.
5. Root tests, backend tests, frontend typecheck/build, browser tests, RC acceptance, and CI pass on the final unchanged candidate.
6. Current screenshots and logs are retained as CI artifacts.
7. Canonical documents and issue state agree.
8. Protected issue #69 remains unchanged.

## Rollback policy

Each milestone is delivered in its own pull request. Roll back by reverting only that milestone's merge commit. A failed milestone must not require reverting the accepted Phase 0 baseline or the completed #111 responsiveness fix unless evidence shows that fix caused the failure.
