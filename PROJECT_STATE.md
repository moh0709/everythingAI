# EverythingAI — Canonical Project State

Date: 2026-08-26  
Authority: current accepted repository state after Product & UX milestone #226  
Current governance issue: #228

## Current program stage

**Phase 2 — Product Intelligence & Knowledge Experience is COMPLETE AND DISPATCHED (`PHASE2_PASS`).**

**Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension is COMPLETE AND DISPATCHED (`PRODUCT_DEPTH_COMPREHENSION_PASS`).**

**Cross-Surface Context Continuity is COMPLETE AND DISPATCHED (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`).**

**Product & UX milestone #222 — Workspace Context Summary & Safe Return Map is ACCEPTED.**

**Product & UX milestone #226 — Workspace Context Provenance & Unknown-State Explanations is ACCEPTED.**

Accepted #222 evidence:

- PR #223 merged as `17195747cb4fed58202992a0907816696b3ca3e1`;
- unchanged implementation head `598bbd007547644380c18b880513f695fd49f147`;
- EverythingAI CI Smoke #658 — PASS;
- EverythingAI Workspace Context Summary run #1 — PASS;
- EverythingAI Source Recovery Return Context run #25 — PASS;
- EverythingAI Multi-hop Return Context run #18 — PASS;
- EverythingAI Return Context Provenance run #14 — PASS;
- final independent diff review — no unresolved Critical or Important findings.

Accepted #224 synchronization evidence:

- PR #225 merged as `e5517027c922c0697441a22b4e946ffa0a44e13e`;
- EverythingAI CI Smoke #660 — PASS;
- EverythingAI Workspace Context Summary run #3 — PASS;
- EverythingAI Source Recovery Return Context run #27 — PASS;
- EverythingAI Multi-hop Return Context run #20 — PASS;
- EverythingAI Return Context Provenance run #16 — PASS;
- final documentation review — no unresolved Critical or Important findings.

Accepted #226 evidence:

- PR #227 merged as `d7a5002582f0b0fb13d95d4656dbaedba651fcb0`;
- unchanged implementation head `28a853b3b01be6dfad7ce025b89e251b2bdb0106`;
- EverythingAI CI Smoke #662 — PASS;
- EverythingAI Workspace Context Provenance run #1 — PASS;
- EverythingAI Workspace Context Summary run #5 — PASS;
- EverythingAI Source Recovery Return Context run #29 — PASS;
- EverythingAI Multi-hop Return Context run #22 — PASS;
- EverythingAI Return Context Provenance run #18 — PASS;
- final independent diff review — no unresolved Critical or Important findings.

Issue #228 is documentation-only canonical synchronization and preparation of a bounded Workspace Context release/dispatch evaluation gate. It does not itself dispatch a release or authorize another product/runtime implementation.

## Authority order

1. Explicit Product Owner / CEO decisions.
2. Accepted PM/release decisions and GitHub acceptance evidence.
3. This `PROJECT_STATE.md`.
4. `AI_BOOTSTRAP.md`.
5. Current roadmap and accepted architecture/runbooks.
6. Accepted handovers, release decisions, reports, tests, commits, and runtime evidence.
7. Unaccepted implementation artifacts.

Implementation completion alone is never acceptance.

## Accepted release chain

- Phase 2 — `PHASE2_PASS` — merge `266c2efa255ba11165ffaf5d0b6385affe0f261b`.
- Trustworthy Search Experience — #142 — merge `d8fad2df21454aa7dce0101abe208fd24b91a883` — final CI #535.
- Governed-Action Lifecycle — #162 — merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` — final CI #568.
- Evidence, Search, Lifecycle & Recovery Comprehension — #198/#199 — merge `e32f3a1db5b1c5447031842cd59bda59afadce90` — release candidate CI #624 and final decision CI #625 — `PRODUCT_DEPTH_COMPREHENSION_PASS`.
- Cross-Surface Context Continuity — #218/#219 — merge `6cbb3c15de8cb5e9624c5fb164a2781790336298` — fresh candidate CI #652 and final decision CI #654 plus all focused return-context workflows — `CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`.
- Canonical post-dispatch synchronization — #220/#221 — merge `dcffd7e9648e37784b91db9852f628e09bed3ee4` — CI #656 plus all three focused return-context workflows.
- Workspace Context Summary & Safe Return Map — #222/#223 — merge `17195747cb4fed58202992a0907816696b3ca3e1` — unchanged-head CI #658 plus Workspace Context Summary #1 and all three prior focused return-context workflows.
- Workspace Context canonical synchronization — #224/#225 — merge `e5517027c922c0697441a22b4e946ffa0a44e13e` — CI #660 plus Workspace Context Summary #3 and all three prior focused return-context workflows.
- Workspace Context Provenance & Unknown-State Explanations — #226/#227 — merge `d7a5002582f0b0fb13d95d4656dbaedba651fcb0` — unchanged-head CI #662 plus Workspace Context Provenance #1, Workspace Context Summary #5, and all three return-context workflows.

Cross-Surface Context Continuity milestone merges remain independently reversible:

- #202 / PR #203 — `698d07aea66d00fbdf65c94eeacc1f15240fd4c2`, CI #629.
- #206 / PR #207 — `21325da2ffb41899047b200d8e71877d022033b0`, CI #634 plus Source Recovery Return Context.
- #210 / PR #211 — `a4cc1fd89ea34a397d8537a8050ff68f56423d35`, CI #641 plus Source Recovery Return Context and Multi-hop Return Context.
- #214 / PR #215 — `a92803adaf5b15a3c5990efb01e4e469a5938311`, CI #645 plus all three focused return-context workflows.
- #216 / PR #217 — `1af6d5be2198e7a6656ce401c451d5042452339d`, CI #650 plus all three focused workflows.

## Program tracks

| Track | Accepted position | Current gate |
|---|---|---|
| Product and UX | Local MVP release-hardened; Phase 2, Product Depth comprehension, Cross-Surface Context Continuity dispatched; Workspace Context Summary and provenance/unknown-state explanations accepted | #228 synchronization, then bounded Workspace Context release/dispatch evaluation |
| Knowledge and Safe Action | Source-backed reading, explainable search, lifecycle/recovery guidance, governed planning/execution/audit/undo, truthful navigation provenance | Preserve evidence/action-scope semantics; no policy or mutation expansion |
| Enterprise Platform | Architecture remains future scope | CEO approval required before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host history remains separate | Explicit business priority plus privileged authority before live infrastructure work |
| Governance and Autonomous Delivery | Dependency-ordered issue → implementation → CI → review → merge loop proven | Preserve unchanged-head evidence, all focused workflows, rollback, and truthful blocker handling |

## Accepted safety contract

Product Depth and Product & UX work remain local-first and bounded.

- Backend-returned search order and match facts remain authoritative.
- Source provenance and citation evidence remain authoritative.
- Ranking signals are never presented as calibrated confidence.
- Frontend does not invent progress, completion, freshness, trust, retry, recovery success, or mutation facts.
- Recovery remains source-root scoped; selected source is navigation provenance only.
- Configured recovery-root identity comes only from current/persisted Folder Path.
- Scan/watcher root identities remain evidence identities and apply to configured root only on exact match.
- Missing or stale source/page/query/history remains unavailable or unknown instead of inferred.
- Stale selected-source IDs never fall back to another file.
- Direct navigation does not fabricate return history.
- Explicit context clearing changes client navigation memory only and triggers no backend/file/recovery/Knowledge Base/governed-action/filesystem mutation.
- Governed planning preserves approval, execution, audit, undo, and the one-filesystem-mutation-per-file guard.

Accepted Workspace Context Summary semantics from #222:

1. The summary is read-only.
2. It exposes only genuinely known current query, valid selected source, recorded Knowledge Base origin, configured source root, and genuine safe-return target.
3. Invalid/stale selected-source state is shown as unavailable and is not substituted.
4. Missing context remains unknown/unavailable rather than inferred.
5. Summary display does not trigger backend, recovery, Knowledge Base, governed action, or filesystem mutation.
6. It uses existing Client Workspace state/identifiers only; no backend or routing architecture was added.

Accepted Workspace Context Provenance semantics from #226:

1. Each displayed Workspace Context fact identifies its genuine existing client-side origin.
2. Unavailable fields explain only the absence/staleness fact supported by current client state; no unobserved root cause is invented.
3. A stale selected-source identifier remains unavailable and never selects a substitute source.
4. Missing Knowledge Base origin, configured Folder Path, query, or safe-return provenance remains explicitly unknown/unavailable.
5. Provenance/explanation rendering is read-only and triggers no backend, file, recovery, Knowledge Base, governed-action, or filesystem mutation.
6. Existing safe-return, explicit context clearing, recovery-scope, and governed-action semantics remain unchanged.

## Mandatory inherited regression baseline

Every subsequent product/release candidate must preserve the complete applicable Phase 1 + Phase 2 + Product Depth baseline on one unchanged candidate, including:

1. root regression;
2. backend tests;
3. frontend TypeScript typecheck;
4. frontend production build;
5. Client/Admin Playwright smoke;
6. rich-citation/source-highlighting acceptance;
7. long-form/table rendering acceptance;
8. grouped-planning/bulk-selection acceptance;
9. API-key lifecycle acceptance;
10. explainable unified-search acceptance;
11. contextual-search-snippet acceptance;
12. Knowledge Base search-navigation acceptance;
13. source-inspection-navigation acceptance;
14. trust-diagnostics-navigation acceptance;
15. planning-selection-clarity acceptance;
16. planning-preview-decision-clarity acceptance;
17. execution/audit/undo outcome-clarity acceptance;
18. knowledge-evidence/freshness-guidance acceptance;
19. search-refinement/filtering acceptance;
20. search-refinement lifecycle/query-context acceptance;
21. lifecycle-status refinement/processing-state acceptance;
22. selected-source lifecycle guidance acceptance;
23. source-root recovery-context acceptance;
24. recovery-outcome guidance acceptance including exact-root, mismatched-root, no-configured-root, and missing-evidence cases;
25. cross-surface context-continuity acceptance;
26. focused `EverythingAI Source Recovery Return Context` acceptance;
27. focused `EverythingAI Multi-hop Return Context` acceptance;
28. focused `EverythingAI Return Context Provenance` acceptance;
29. focused `EverythingAI Workspace Context Summary` acceptance;
30. focused `EverythingAI Workspace Context Provenance` acceptance;
31. complete inherited CI matrix validation on the required unchanged candidate together with all applicable focused gates;
32. disposable-folder RC acceptance;
33. UI-governed planning → preview → approval → execution → audit → undo acceptance;
34. independent final review with no unresolved Critical or Important findings;
35. milestone-scoped rollback evidence.

Historical green evidence is supporting evidence only and never substitutes for validating a changed candidate. Accepted focused workflows remain part of the baseline unless explicitly superseded by an accepted decision.

## Current next action

Complete #228 documentation synchronization. Validate its unchanged documentation head with EverythingAI CI Smoke, Workspace Context Provenance, Workspace Context Summary, Source Recovery Return Context, Multi-hop Return Context, and Return Context Provenance workflows, then perform final documentation review before merge.

If #228 is accepted, prepare a separate **Workspace Context Trust & Provenance release/dispatch gate** covering the already accepted #222 and #226 behaviors. That gate must use a fresh unchanged release candidate, rerun the complete inherited CI matrix plus every focused context workflow, independently review the tranche, and write explicit PASS/FAIL release evidence before dispatch. It does not authorize another feature.

## CEO-gated material expansion

The following remain unauthorized without explicit CEO approval:

- authentication or tenancy;
- cloud deployment;
- database migration or object storage;
- privileged-host/systemd work;
- production-platform architecture execution;
- new routing architecture;
- automatic action/recovery/rebuild behavior;
- material connector/runtime expansion;
- new semantic/provider architecture with material runtime, cost, or trust implications.

## Issue #69

Issue #69 (`EAI-TASK-046`) is closed completed historical Phase 3/Hermes reliability evidence. It is not an active dependency. Do not rewrite its historical acceptance record unless a newly discovered factual inconsistency is escalated for explicit CEO review.

## Rollback

#228 is documentation-only. Revert only its synchronization merge if required. Product/runtime/data behavior is unaffected. All earlier accepted milestone rollback evidence remains independently valid.