# Phase 3.1 — Enterprise Isolation Acceptance

Date: 2026-08-28
Issue: #292
PR: #293
Status: ACCEPTED

## Accepted implementation

Phase 3.1 establishes the first bounded Enterprise Platform implementation under CEO-approved ER-1 through ER-5.

Accepted merge: `6dead7b5a62161ed80670b7c9cc28c693b709d14`.

The accepted implementation adds a production-only, provider-neutral OIDC identity boundary; fail-closed tenant/workspace authorization; PostgreSQL tenant/workspace row-level-security foundations; tenant-bound workspace isolation; and scoped PostgreSQL transaction enforcement.

## Preserved boundaries

- SQLite remains the local-first runtime and is not destructively migrated.
- Production PostgreSQL remains opt-in.
- No production credentials or secrets are provisioned by this milestone.
- No cloud-provider lock-in is introduced.
- No automatic action/recovery or connector/runtime expansion is introduced.
- Historical issue #69 remains unchanged.
- All accepted governed-action, audit, undo, context-trust and filesystem-safety semantics remain inherited.

## Validation evidence

The final unchanged implementation head passed EverythingAI CI Smoke #768, all fifteen inherited mandatory focused workflows, and the Enterprise Isolation focused workflow #10. Strict RED→GREEN evidence was preserved for the new enterprise-isolation acceptance. Final security review identified and corrected two isolation/trust weaknesses before merge; the accepted final review had no unresolved Critical or Important findings or unresolved review threads.

Historical green evidence does not substitute for validation of future changed candidates.

## Rollback

Phase 3.1 is independently reversible by reverting merge `6dead7b5a62161ed80670b7c9cc28c693b709d14`. Existing local-first SQLite behavior remains the fallback product/runtime boundary.

## Next dependency

The next dependency-safe Enterprise Platform milestone is the ER-5 S3-compatible object-storage abstraction. It must remain provider-neutral and opt-in, preserve local filesystem behavior, enforce tenant/workspace scope at its production persistence boundary, avoid production secret provisioning, and add focused acceptance before any migration of existing document bytes is authorized.