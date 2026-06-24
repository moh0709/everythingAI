# EverythingAI Hermes Framework Foundation

This repository now includes the minimal Hermes PM worker foundation required for issue polling and readiness checks.

## Included files

- `scripts/task-poller.mjs`
- `scripts/task-worker.mjs`
- `scripts/framework-doctor.mjs`
- `src/task-queue.js`
- `templates/*`
- `skills/hermes-pm-framework.*`
- root `package.json` scripts for worker and doctor commands

## Notes

- The foundation is intentionally conservative and does not alter core application behavior.
- The worker helpers are designed to inspect GitHub issues and skip tasks that already have matching report artifacts.