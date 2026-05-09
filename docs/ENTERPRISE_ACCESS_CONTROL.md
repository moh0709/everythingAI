# Enterprise Access Control

## Purpose

EverythingAI must support admin-controlled access to pages, capabilities, workspaces, knowledge areas, and AI agent authority.

The platform contains sensitive enterprise knowledge and operational actions, so access control must be enforced in both frontend and backend.

## Core access model

EverythingAI uses three permission layers:

| Layer | Purpose |
|---|---|
| Page access | Controls which UI pages a user can open |
| Capability access | Controls what actions a user can perform |
| Data scope access | Controls which tenant/workspace/knowledge area data the user can see |

Frontend hiding improves UX only. Backend enforcement is mandatory security.

## Default roles

| Role | Purpose |
|---|---|
| Viewer | Search and explore only |
| Contributor | Upload files and suggest organization |
| Operator | Review plans, execute approved plans, restore files |
| Governance Admin | Manage approvals, replay, retention, governance policies |
| System Admin | Manage users, roles, security, infrastructure, settings |

## Page access

Admins should control access to:

```text
Search & Explore
Knowledge Areas
Upload Center
Planning Center
Recovery Center
Operations Center
Stats & Insights
Governance Center
Ticket Center
Admin Console
Security Settings
System Health
```

## Capability access

Initial capability set:

```text
search.knowledge
view.documents
upload.files
create.collections
suggest.organization
simulate.plan
approve.plan
execute.plan
restore.files
delete.files
purge.files
view.replay
manage.tickets
view.insights
manage.users
manage.roles
manage.retention
manage.security
```

## Workspace and Knowledge Area access

Permissions must be scopeable by workspace and knowledge area.

Example:

```text
Engineering:
  Viewer can search
  Contributor can upload
  Operator can organize
  Governance Admin can approve

Finance:
  Only Finance users can view
  Only Finance Admin can approve movement
```

## AI authority boundaries

Admins must control what AI agents may do.

Default MVP permissions:

| AI capability | Default |
|---|---|
| classify files | allowed |
| suggest organization | allowed |
| create tickets | allowed |
| simulate plans | allowed |
| execute plans | disabled |
| restore files | disabled |
| purge files | forbidden |
| change policies | forbidden |
| change user access | forbidden |

Core rule:

```text
AI can propose. Humans govern.
```

## Admin Console

The Admin Console should include:

```text
Users
Roles
Page Access
Capability Access
Workspace Access
Knowledge Area Access
AI Agent Permissions
Source Mode Settings
Retention Settings
Security Settings
Audit Logs
Tenant Settings
```

## Required backend enforcement

All protected API calls must validate:

```text
authenticated user
tenant boundary
workspace boundary
knowledge area access
capability permission
AI authority boundary when actor is an agent
policy constraints
```

## Recommended implementation targets

```text
packages/auth/roles.ts
packages/auth/permissions.ts
packages/auth/pageAccess.ts
packages/auth/capabilities.ts
packages/admin/pageAccessContract.ts
packages/admin/aiPermissionContract.ts

apps/api/src/auth/permissionGuard.ts
apps/api/src/auth/tenantGuard.ts
apps/api/src/admin/admin-access.controller.ts

apps/web/src/navigation/permissionNavigation.ts
apps/web/src/admin/RoleAccessMatrix.tsx
apps/web/src/admin/AIAuthoritySettings.tsx

services/governance/src/access/accessPolicyService.ts
services/admin/src/pageAccessService.ts
services/admin/src/capabilityAccessService.ts
services/admin/src/aiPermissionService.ts
```

## Launch blockers

Do not launch without:

- Backend permission enforcement
- Tenant isolation
- Role and capability control
- Admin page access control
- AI authority restrictions
- Audit events for permission and policy changes
