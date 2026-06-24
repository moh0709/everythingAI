# Hermes PM Framework

This skill provides the minimal EverythingAI worker foundation for issue polling, task selection, report writing, and doctor checks.

## Rules

- Process at most one issue at a time.
- Skip issues that already have a matching report artifact.
- Prefer safe validation commands already documented in the repository.
- Do not change core production code for readiness or smoke tasks unless the issue explicitly requires it.
- Do not expose secrets or environment variables.
- Keep report, issue comment, and commit SHA aligned.

## Artifact conventions

- Logs: `LOGS/EAI-TASK-###-terminal.log`
- Reports: `REPORTS/EAI-TASK-###-*.md`
- State: `.hermes/state.json` when present and permitted by the repo workflow