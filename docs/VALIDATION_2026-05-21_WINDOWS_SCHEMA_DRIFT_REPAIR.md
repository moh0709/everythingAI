# Windows Schema Drift Repair Validation

Date: 2026-05-21

## Scope

This note records the Windows runtime issue found during the local user UI smoke test at:

```text
http://localhost:5151
```

## Issue

The local SQLite database had older Wiki tables and was missing newer durable Wiki evidence columns.

Observed missing-column errors included:

```text
status
source_ref
page_source_id
```

## Repair

A backend repair command was added:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm run repair:wiki-schema
```

Related files:

```text
services/api/src/db/repairWikiSchema.js
services/api/package.json
```

## User validation

After rerunning the repair command and restarting the local debug stack, the user reported that the app works.

## Result

PASS for the specific local SQLite schema-drift failure.

This does not yet claim the full Windows MVP smoke test is complete. The full flow still needs explicit validation across Start, Explore, Wiki, Ask, and safe action boundaries.
