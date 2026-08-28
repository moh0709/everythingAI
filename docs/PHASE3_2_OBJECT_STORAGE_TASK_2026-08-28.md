# Phase 3.2 — Object Storage Implementation Task

Status: RELEASED FOR IMPLEMENTATION
Date: 2026-08-28

Implement only the bounded acceptance plan in `docs/PHASE3_2_OBJECT_STORAGE_ACCEPTANCE_PLAN_2026-08-28.md`.

Start by inventorying current filesystem/document byte ownership and tests. Add the smallest reversible storage abstraction that can preserve local-first behavior while supporting an explicitly configured S3-compatible adapter. Do not migrate existing bytes. Do not provision secrets or infrastructure. Do not weaken Phase 3.1 tenant/workspace isolation.

Required lifecycle: inspect → strict RED acceptance where feasible → narrow implementation → focused tests → complete inherited CI/focused baseline → security/diff review → accept/reject → merge/close.

If implementation reveals a need for a new material architecture choice outside ER-1 through ER-5, stop and escalate that exact choice to the CEO rather than silently expanding scope.