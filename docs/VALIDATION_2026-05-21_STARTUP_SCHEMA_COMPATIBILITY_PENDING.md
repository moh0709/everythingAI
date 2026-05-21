# Startup Schema Compatibility Hardening Pending

Date: 2026-05-21

## Context

The Windows smoke test found local SQLite schema drift in older Wiki tables.

The manual repair command currently resolves the observed local failure:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm run repair:wiki-schema
```

## Current confirmed state

The manual repair fixed the known missing-column errors reported during smoke testing:

```text
status
source_ref
page_source_id
```

The user reported the app works after repair.

## Pending hardening

A startup compatibility helper was introduced:

```text
services/api/src/db/schemaCompatibility.js
```

The next backend hardening step is to wire this helper into:

```text
services/api/src/db/client.js
```

so `openDatabase()` applies safe compatibility columns before loading `schema.sql`.

## Why pending

This should be done as a small controlled backend patch and validated with:

```text
cd E:\01PROJEKTER\EverythingAI\services\api
npm test
```

No frontend refactor is required.
