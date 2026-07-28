# Forge Operating Model

Forge is the primary implementation owner for issues released with `pm:ready` and `forge:ready`. GitHub is the authoritative queue and PM remains the independent reviewer.

## Lifecycle

1. The trigger lists open issues carrying both readiness labels.
2. It re-reads the selected issue immediately before mutation and rejects `forge:working`, `forge:done`, `forge:blocked`, `pm:review`, Atlas, and Hermes ownership labels.
3. A durable local lock is acquired. Cross-host locks are never removed automatically.
4. `forge:ready` is replaced by `forge:working`; the mutation is re-read and verified.
5. The complete issue body, `PROJECT_STATE.md`, `AI_BOOTSTRAP.md`, starting SHA, and automation boundary are written to `.hermes/forge/context-<issue>.json`.
6. Forge posts one claim acknowledgement and sends a quiet, sanitized lifecycle report.
7. Forge integrates and validates the work, then submits `forge:done + pm:review`, or `forge:blocked + pm:review` with exact evidence. Forge never closes or self-accepts PM work.

## Automation boundary

The installed desktop build exposes a Codex executable, but direct invocation from this workspace was denied by the Windows app-container permission boundary. The callable desktop surface available to this session does not provide a supported poller-to-existing-thread handoff contract. Therefore the supported status is `AUTOMATIC_DETECTION_WITH_HUMAN_START`: the trigger detects, claims, persists complete context, and reports the exact context path; a human starts or resumes the Codex task in the desktop app.

The implementation must not claim that Codex was awakened automatically. A future supported handoff API can replace this boundary after live proof and a PM review.

## Quiet operation

Idle ticks produce a local machine-readable `IDLE` result only. Telegram is reserved for release, claim, meaningful milestone, blocker, PM-review submission, and PM decision events.
