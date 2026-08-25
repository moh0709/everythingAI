# EverythingAI — Canonical Project State

Date: 2026-08-26  
Authority: current accepted repository state after Product & UX milestone #222  
Current governance issue: #224

## Current program stage

**Phase 2 — Product Intelligence & Knowledge Experience is COMPLETE AND DISPATCHED (`PHASE2_PASS`).**

**Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension is COMPLETE AND DISPATCHED (`PRODUCT_DEPTH_COMPREHENSION_PASS`).**

**Cross-Surface Context Continuity is COMPLETE AND DISPATCHED (`CROSS_SURFACE_CONTEXT_CONTINUITY_PASS`).**

**Product & UX milestone #222 — Workspace Context Summary & Safe Return Map is ACCEPTED.**

Accepted #222 evidence:

- PR #223 merged as `17195747cb4fed58202992a0907816696b3ca3e1`;
- unchanged implementation head `598bbd007547644380c18b880513f695fd49f147`;
- EverythingAI CI Smoke #658 — PASS;
- EverythingAI Workspace Context Summary run #1 — PASS;
- EverythingAI Source Recovery Return Context run #25 — PASS;
- EverythingAI Multi-hop Return Context run #18 — PASS;
- EverythingAI Return Context Provenance run #14 — PASS;
- final independent diff review — no unresolved Critical or Important findings.

Issue #224 is documentation-only synchronization and preparation of exactly one next bounded governance option. It does not authorize another implementation merely by being accepted.

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

Cross-Surface Context Continuity milestone merges remain independently reversible:

- #202 / PR #203 — `698d07aea66d00fbdf65c94eeacc1f15240fd4c2`, CI #629.
- #206 / PR #207 — `21325da2ffb41899047b200d8e71877d022033b0`, CI #634 plus Source Recovery Return Context.
- #210 / PR #211 — `a4cc1fd89ea34a397d8537a8050ff68f56423d35`, CI #641 plus Source Recovery Return Context and Multi-hop Return Context.
- #214 / PR #215 — `a92803adaf5b15a3c5990efb01e4e469a5938311`, CI #645 plus all three focused return-context workflows.
- #216 / PR #217 — `1af6d5be2198e7a6656ce401c451d5042452339d`, CI #650 plus all three focused workflows.

## Program tracks

| Track | Accepted position | Current gate |
|---|---|---|
| Product and UX | Local MVP release-hardened; Phase 2, Product Depth comprehension, Cross-Surface Context Continuity dispatched; Workspace Context Summary accepted | #224 synchronization; next recommended bounded option is Workspace Context Provenance & Unknown-State Explanations |
| Knowledge and Safe Action | Source-backed reading, explainable search, lifecycle/recovery guidance, governed planning/execution/audit/undo, truthful navigation provenance | Preserve evidence/action-scope semantics; no policy or mutation expansion |
| Enterprise Platform | Architecture remains future scope | CEO approval required before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host history remains separate | Explicit business priority plus privileged authority before live infrastructure work |
| Governance and Autonomous Delivery | Dependency-ordered issue → implementation → CI → review → merge loop proven | Preserve unchanged-head evidence, focused workflows, rollback, and truthful blocker handling |

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
30. complete inherited CI matrix validation on the required unchanged candidate together with all applicable focused gates;
31. disposable-folder RC acceptance;
32. UI-governed planning → preview → approval → execution → audit → undo acceptance;
33. independent final review with no unresolved Critical or Important findings;
34. milestone-scoped rollback evidence.

Historical green evidence is supporting evidence only and never substitutes for validating a changed candidate. Accepted focused workflows remain part of the baseline unless explicitly superseded by an accepted decision.

## Current next action

Complete #224 documentation synchronization. Validate its unchanged documentation head with EverythingAI CI Smoke, Workspace Context Summary, Source Recovery Return Context, Multi-hop Return Context, and Return Context Provenance workflows, then perform final documentation review before merge.

After #224 acceptance, the single recommended bounded option is **Workspace Context Provenance & Unknown-State Explanations**: a read-only enhancement to the accepted Workspace Context Summary that explains the genuine origin of each displayed context fact and why unavailable fields are unknown, using existing Client Workspace state only. A separate implementation issue is required before code changes.

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

#224 is documentation-only. Revert only its synchronization merge if required. Product/runtime/data behavior is unaffected. All earlier accepted milestone rollback evidence remains independently valid.