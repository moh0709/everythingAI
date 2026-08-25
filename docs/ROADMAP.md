# EverythingAI — Current Roadmap

Date: 2026-08-25  
Current product state: **Phase 2 complete and dispatched (`PHASE2_PASS`)**  
Current Product Depth state: **Evidence, Search, Lifecycle & Recovery Comprehension complete and dispatched (`PRODUCT_DEPTH_COMPREHENSION_PASS`)**  
Cross-Surface Context Continuity: **milestones #202 and #206 accepted**  
Accepted comprehension release merge: `e32f3a1db5b1c5447031842cd59bda59afadce90`

## Completed product sequence

### Phase 0 — Reconciliation and Release Control

Complete. Established the five-track model, execution ownership, release-candidate baseline, and evidence discipline.

### Phase 1 — Local MVP Product Review and Release Hardening

Complete. Hardened the local MVP, source-processing/recovery lifecycle, Unicode integrity, governed action/undo flow, and release evidence.

### Phase 2 — Product Intelligence & Knowledge Experience

Complete and dispatched as `PHASE2_PASS`. Delivered rich citations/source highlighting, improved long-form/table rendering, grouped planning/bulk selection, secure provider API-key lifecycle UX, controlled frontend modularization, and unchanged-head release validation.

Release evidence:

- `docs/PHASE2_RELEASE_DECISION_2026-08-23.md`
- `docs/HANDOVER_2026-08-23_PHASE2_RELEASE_DECISION.json`

### Product Depth — Trustworthy Search Experience

Accepted and dispatched through #142 merge `d8fad2df21454aa7dce0101abe208fd24b91a883` after final unchanged-head CI #535 and independent diff review.

### Product Depth — Governed-Action Lifecycle

Accepted as `PRODUCT_DEPTH_ACTION_LIFECYCLE_PASS` through #162 / PR #163 merge `241b8c8cb723a43be1ede211fdfc55acf15d96e2` after final CI #568.

### Product Depth — Evidence, Search, Lifecycle & Recovery Comprehension

Accepted and dispatched as `PRODUCT_DEPTH_COMPREHENSION_PASS` through #198 / PR #199 merge `e32f3a1db5b1c5447031842cd59bda59afadce90`.

Release evidence:

- post-synchronization release candidate `de8302a281badff75d8408fdcba1fbc15f9916ca` — CI #624 PASS;
- release-decision head `94d303c8e687f01f4f8f1e4216ac2357cea0beb7` — CI #625 PASS;
- final documentation review — no unresolved Critical or Important findings;
- `docs/PRODUCT_DEPTH_COMPREHENSION_RELEASE_DECISION_2026-08-25.md`;
- `docs/HANDOVER_2026-08-25_PRODUCT_DEPTH_COMPREHENSION_RELEASE.json`.

Accepted implementation milestones in the comprehension tranche:

1. #166 knowledge evidence quality/safe freshness guidance — `9b41167f41b89ff6ae5a8deb7064c817bfb205fb`, CI #574.
2. #170 read-only search refinement/filtering UX — `7be19cb1ec36eca6f20c73ed7ee93543d6a4d6ce`, CI #579.
3. #174 search refinement lifecycle/query-context clarity — `6ba75a928b5d126a893ed7089d9c7a391b75ee02`, CI #584.
4. #178 lifecycle-status refinement/processing-state clarity — `48531f7d1ff843c6a23180b5331f3c05fd2df1da`, CI #595.
5. #182 selected-source lifecycle next-step clarity — `2c4b5596230b498a8fa20977bdf1790b13ff4955`, CI #600.
6. #186 source-root recovery context/safe guidance — `3f7c4a4f7ec6560b9b588d22a1e22a658d4bec49`, CI #604.
7. #190 recovery outcome interpretation/safe next-step guidance — `da4fa079927f3d38dc6a3c444db5d93bbeca40c6`, CI #611.
8. #194 recovery evidence scope alignment/context clarity — `a869b305457d8fc18bd3b9265990e9d0065d2c6b`, CI #618.

### Product Depth — Cross-Surface Context Continuity

Milestone #202 is accepted. PR #203 merged as `698d07aea66d00fbdf65c94eeacc1f15240fd4c2` after unchanged-head CI Smoke #629 passed on `d63cdb84c836e882d3734c6aeade98a5010043fc` and final PM review found no unresolved Critical or Important findings.

Accepted #202 behavior:

- Knowledge Base source inspection remembers the genuine originating knowledge page;
- current search query is preserved when opening genuine source context;
- explicit safe return targets the recorded origin;
- direct Sources & Files navigation does not fabricate a Knowledge Base return context;
- the behavior uses existing Client Workspace state/identifiers and does not change mutation semantics.

Milestone #206 is accepted. PR #207 merged as `21325da2ffb41899047b200d8e71877d022033b0`; focused workflow `EverythingAI Source Recovery Return Context` passed on unchanged head `deb06e7055d57cf6feeb49e97222750f838f1a10`; full CI Smoke #634 passed the complete inherited matrix on the same head; final PM review was clean.

Accepted #206 behavior:

- Sources & Files → source-root Recovery preserves only the genuine selected-source navigation origin and current query;
- the selected file is explicitly navigation origin, not recovery scope;
- recovery remains source-root scoped with no per-file retry/recovery semantics;
- returning restores the same source only when it still exists;
- a missing source never causes a substitute source to be inferred or selected;
- direct Home/recovery navigation clears the recorded source origin.

Canonical synchronization milestones remain governance evidence and do not add product behavior.

## Current five-track position

| Track | Position | Next gate |
|---|---|---|
| Product and UX | Strong local MVP; Phase 2 and Product Depth comprehension dispatched; Cross-Surface Context Continuity accepted through #206 | #208 synchronization, then exactly one bounded multi-hop continuity issue may be released |
| Knowledge and Safe Action | Proven source-backed reading, explainable search, evidence navigation, lifecycle guidance, exact-root recovery evidence, governed planning/execution/audit/undo | Preserve truthful evidence scope while improving movement between existing surfaces |
| Enterprise Platform | Target architecture exists; production platform not authorized | CEO decision before auth, tenancy, cloud deployment, DB migration, object storage, or production-platform implementation |
| Engineering Operations | Reliability/host history exists separately | Explicit business priority plus privileged authority before live host work |
| Governance and Autonomous Delivery | Evidence-backed issue/PR/CI/review loop proven | Preserve exact dependency, inherited CI wiring, rollback, and truthful blocker discipline |

## Active dependency sequence

```text
PRODUCT_DEPTH_COMPREHENSION_PASS accepted and dispatched
  -> #202 Cross-Surface Context Continuity accepted
    -> #206 Source-to-Recovery Return Context accepted
      -> #208 canonical synchronization + bounded continuity decision gate
        -> accept/reject #208 after CI and final documentation review
          -> if accepted, release exactly one bounded implementation issue
```

Issue #208 does not itself authorize another product/runtime implementation milestone.

## Recommended next bounded direction

**Multi-Hop Return-Context Continuity**

Goal: preserve a truthful navigation chain across the existing Knowledge Base → Source Inspection → Recovery → Source Inspection → Knowledge Base flow without adding backend intelligence, routing architecture, or mutation semantics.

A separately released implementation issue should require:

- only genuinely recorded Knowledge Base/source origins may be carried forward;
- the current query may be retained where it already belongs to the source-inspection context;
- Recovery remains source-root scoped; selected-file identity remains navigation context only;
- if a recorded source/page no longer exists, the stale origin is cleared or shown unavailable rather than replaced by an inferred alternative;
- direct navigation must not fabricate a multi-hop return chain;
- existing Client Workspace state/identifiers only unless a separately approved gate proves a minimal contract is required.

## CEO-gated directions

The following remain material expansion and require explicit CEO selection/approval before implementation:

- authentication or tenancy;
- cloud deployment;
- database migration or object storage;
- privileged-host/systemd work;
- material connector/runtime expansion;
- production-platform architecture execution;
- new semantic/provider architecture with material runtime or cost implications.

## Mandatory inherited release discipline

Every new product/release candidate must pass the full applicable inherited matrix on one unchanged head. The accepted cross-surface context-continuity acceptance from #202 plus the focused/full-matrix source-to-recovery return-context acceptance from #206 are now part of that baseline. Historical green results do not substitute for current validation. Previously accepted focused gates must remain wired into CI unless an explicit accepted supersession says otherwise. Every accepted change retains milestone-scoped rollback evidence.

## Issue #69

Issue #69 is closed completed historical Phase 3/Hermes reliability evidence. It is not an open dependency and must not be rewritten without explicit CEO review of a newly discovered factual inconsistency.
