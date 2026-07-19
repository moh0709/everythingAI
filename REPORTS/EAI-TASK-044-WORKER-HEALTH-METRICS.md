# EAI-TASK-044 — Worker health CLI and metrics snapshot

## Result

**PASS — correction pass completed.** The PM rejection gaps were addressed without changing application code under `apps/` or `services/`.

## Delivered

- `scripts/hermes-health.mjs`
  - Read-only JSON and concise human output.
  - `--root` support for isolated fixture validation.
  - Queue failures and thrown queue lookups safely become `{available:false, ready:null}`.
  - Injected clock governs timestamp and filesystem-mtime age calculations with deterministic millisecond rounding.
  - Sensitive current issue/task values are passed through the existing redaction policy.
- `tests/hermes-health.test.mjs`
  - 27 focused tests covering all statuses, precedence, malformed/missing artifacts, corrupt middle versus partial trailing history, queue unavailable/throws, exact heartbeat and lock-age boundaries, rotated-history ordering, secret canaries, and actual JSON/human CLI immutability.
- `docs/HERMES_WORKER_HEALTH.md`
  - Documents the precedence table, queue failure behavior, and `--root` fixture/operator command.
- `LOGS/EAI-TASK-044-terminal.log`
  - Complete validation transcript.

## Validation evidence

| Check | Result |
|---|---:|
| Focused health suite | 27/27 PASS |
| `npm test` | 138/138 PASS |
| `npm run framework:doctor` | PASS |
| JSON checks | PASS |
| `git diff --check` | PASS |
| Live JSON CLI | Valid output; `STOPPED`, `readOnly=true`, queue available, no stderr |

The live command intentionally returned exit code 1 because the repository heartbeat reports `STOPPED`; the transcript treats that alert exit as expected and validates the JSON output.

## QA corrections closed

1. Queue-unavailable and queue-throws behavior is deterministic and tested.
2. Claim and supervisor lock ages are tested at exact 120000/120001 ms boundaries; mtime fallback uses the injected clock.
3. CLI tests execute both modes against an isolated runtime root containing secret canaries.
4. Queue, filesystem, malformed-artifact, and error paths are checked for non-disclosure.
5. Runtime tree bytes, metadata, inode, directory entries, and absence remain unchanged across inspection.
6. Missing-artifact cases isolate each target artifact rather than repeating one all-missing fixture.

## Commits

- Implementation and validation artifacts: `f0d712a28501724f465efed52979f341be7b7c9c`
- Report and handover artifacts: `a5314d2735322ed03c3bde776991854b15f77aba`
- Final state metadata: `76313d93d10e16a02ad294d000996ed92709c81f`

## Scope and safety

No secrets, environment dumps, webhook payloads, credentials, or raw corrupt records are included. The health command remains read-only and no core application code was modified.
