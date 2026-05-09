# Enterprise Workspace PRD

## Product identity

EverythingAI is evolving into a **Governed Enterprise Cognitive Workspace**: a trusted knowledge operating environment where enterprise files are ingested, understood, organized, searched, governed, recovered, measured, and continuously improved.

The product is not primarily a chatbot, vector database, or file explorer. It is a governed enterprise knowledge ecosystem.

## Core product loop

```text
onboard workspace
  -> ingest files
  -> extract content
  -> normalize knowledge
  -> search and explore
  -> generate organization plan
  -> simulate plan
  -> approve plan
  -> execute safely
  -> recover if needed
  -> monitor health and insights
```

## MVP scope

The MVP must include:

- Onboarding and workspace setup
- Admin-controlled user, role, page, and capability access
- File ingestion with Reference Mode and Copy Mode
- Internal file ecosystem with source-of-truth tracking
- Search & Explore wiki-style knowledge base
- Knowledge Areas and Semantic Collections
- Planning Center with simulations and before/after previews
- Governed Execution for approved internal ecosystem actions
- Recovery Center with trashbin, snapshots, restore, rollback, and default 30-day retention
- Operations Center with user tickets, AI-generated tickets, and runtime health
- Stats & Insights page with KPIs and health scoring
- Audit, replay, governance, and trust indicators

## Non-goals for MVP

Delay until after MVP:

- Fully autonomous execution without approval
- Managed Mode as default source-of-truth mode
- Permanent purge automation by AI
- Cross-organization federation
- Digital twins
- Advanced marketplace/plugin ecosystem
- Mobile app
- CAD, video, archive, and email extraction beyond initial experiments

## Primary users

| User type | Primary need |
|---|---|
| Viewer | Search and explore trusted enterprise knowledge |
| Contributor | Upload files and suggest improvements |
| Operator | Review plans, execute approved actions, restore files |
| Governance Admin | Approve changes, manage retention, view replay/audit |
| System Admin | Manage tenants, users, roles, security, and settings |

## Primary navigation

```text
Search & Explore
Knowledge Areas
Upload / Ingestion
Planning
Recovery
Operations
Stats & Insights
Governance
Admin Console
Settings
```

Navigation must render dynamically based on page access and permissions.

## Core product principles

1. Enterprise knowledge must always show source, context, confidence, and governance.
2. AI may propose, simulate, and explain; governance controls execution.
3. Destructive actions must be recoverable by default.
4. Admins control what users and AI agents may access or do.
5. The product must feel calm, premium, predictable, and safe.

## MVP launch gate

The MVP is ready only when this core loop works end-to-end:

```text
admin creates workspace
user uploads files
system extracts and indexes content
user searches knowledge with filename references
AI generates a plan
plan is simulated
approved plan executes safely
execution creates recovery snapshot
files can be restored
operations/tickets and KPIs show health
admin controls access
```
