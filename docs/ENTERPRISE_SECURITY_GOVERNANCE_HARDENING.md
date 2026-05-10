# Enterprise Security & Governance Hardening Specification

## Purpose

This document defines the minimum security, governance, and AI-safety hardening required for the EverythingAI Workspace MVP.

EverythingAI will process sensitive enterprise knowledge, files, metadata, operational reasoning, recovery snapshots, and AI-generated proposals. Therefore security is a product requirement, not only an infrastructure concern.

---

# 1. Core Security Principle

Every cognitive operation must be:

```text
authenticated
authorized
tenant-isolated
policy-validated
audited
recoverable when destructive
observable
```

No important operation should happen silently.

---

# 2. Zero-Trust Platform Rules

The platform must not automatically trust:

```text
users
AI agents
uploaded files
file extensions
external paths
worker jobs
frontend visibility
network location
```

Every request and operation must be validated server-side.

---

# 3. Tenant Isolation Requirements

Tenant isolation is mandatory.

All data access must include tenant boundaries:

```text
tenant_id
workspace_id
knowledge_area access where applicable
```

Required controls:

```text
[ ] Every table has tenant_id where tenant-scoped.
[ ] Every workspace-scoped table has workspace_id.
[ ] Every API query filters by tenant_id.
[ ] Cross-tenant file access returns 403 or 404.
[ ] Search cannot return cross-tenant results.
[ ] Vector search filters by tenant_id and workspace_id.
[ ] Object storage keys include tenant/workspace prefix.
[ ] AI context assembly cannot mix tenants.
```

Launch blocker:

```text
Any cross-tenant data leak blocks release.
```

---

# 4. Permission Enforcement

Backend permissions must validate:

```text
user identity
tenant membership
workspace access
knowledge area access
capability permission
page permission where relevant
AI actor authority when actor is an agent
```

Frontend page hiding is not security.

Required behavior:

| Scenario | Expected |
|---|---|
| Viewer calls upload endpoint | Denied |
| Viewer calls admin endpoint | Denied |
| Contributor executes plan | Denied unless granted |
| Operator changes retention | Denied |
| AI actor requests purge | Denied |
| System Admin updates policy | Allowed + audit |

---

# 5. AI Authority Boundaries

AI agents may:

```text
classify files
extract metadata suggestions
suggest organization
recommend canonical documents
generate plans
simulate plans
create tickets
generate insights
recommend fixes
```

AI agents may not in MVP:

```text
permanently purge files
change retention policies
change user roles
change permissions
change source-of-truth mode
move original external files
execute high-risk plans without approval
bypass approval workflows
access cross-tenant data
```

Core rule:

```text
AI can propose. Humans govern.
```

---

# 6. File Upload Security

The upload pipeline must validate:

```text
file size
mime type
extension consistency
magic bytes where practical
path traversal attempts
unsupported file types
malformed files
known dangerous extensions
```

Minimum controls:

```text
[ ] Enforce MAX_UPLOAD_SIZE_BYTES.
[ ] Never trust client-provided filename for storage path.
[ ] Generate internal object keys server-side.
[ ] Normalize filenames for display only.
[ ] Store original filename separately.
[ ] Reject path traversal sequences.
[ ] Disable archive extraction in MVP unless sandboxed.
[ ] Disable macro execution.
```

Recommended later:

```text
ClamAV scanning
sandboxed extraction containers
file content disarm/reconstruction
rate limiting per tenant/user
```

---

# 7. Object Storage Security

Storage keys must follow:

```text
tenants/{tenant_id}/workspaces/{workspace_id}/...
```

Rules:

```text
[ ] Never store raw files outside tenant/workspace prefix.
[ ] Never expose raw object storage credentials to frontend.
[ ] Use signed URLs only when needed.
[ ] Signed URLs must be short-lived.
[ ] Access must be checked before signed URL creation.
[ ] Purge file content without deleting audit/replay metadata.
```

---

# 8. Search & Retrieval Security

Search must enforce governance filtering.

Every search must filter by:

```text
tenant_id
workspace_id
user permissions
knowledge area access
file sensitivity when implemented
retention/status
source mode policy
```

AI answer generation must only use documents the user is allowed to access.

Launch blocker:

```text
Search result leakage across tenants or restricted knowledge areas blocks release.
```

---

# 9. Planning Security

Planning may analyze allowed workspace knowledge only.

Rules:

```text
[ ] Plan generation respects user scope.
[ ] Plan actions include reasons.
[ ] Plan actions include risk levels.
[ ] Plan simulation is required before execution.
[ ] Plan cannot execute before approval.
[ ] High-risk plans require higher approval.
[ ] Plans cannot permanently purge files in MVP.
```

---

# 10. Execution Security

Execution requires:

```text
approved plan
permission validation
policy validation
execution lock
recovery snapshot
audit event
replay reference
bounded internal action scope
```

Execution must not:

```text
operate outside tenant/workspace
mutate external originals in MVP
execute unapproved plans
execute unsupported actions
perform permanent purge
skip recovery snapshot
```

---

# 11. Recovery & Retention Security

Default retention:

```text
30 days
```

Rules:

```text
[ ] Delete-like actions move to trash first.
[ ] Restore requires permission.
[ ] Purge requires elevated approval.
[ ] AI cannot purge.
[ ] Audit metadata remains after purge.
[ ] Replay metadata remains after purge.
[ ] Recovery snapshot integrity must be validated before rollback.
```

---

# 12. Audit Requirements

Audit events are required for:

```text
login/session events where practical
permission changes
role changes
AI permission changes
source mode changes
retention changes
file upload
file extraction failure
search query
plan generation
plan simulation
plan approval/rejection
execution start/completion/failure
trash move
restore
purge request/approval
AI-generated ticket
security denial events
```

AuditEvent must include:

```text
audit_event_id
tenant_id
workspace_id where relevant
event_type
actor_type
actor_id
target_type
target_id
payload_json
created_at
```

---

# 13. Secrets Management

Rules:

```text
[ ] No secrets committed to git.
[ ] Provide .env.example only.
[ ] Use strong JWT/session secrets.
[ ] Rotate demo/default secrets before deployment.
[ ] Object storage credentials stay server-side.
[ ] LLM/API keys stay server-side.
```

Recommended later:

```text
Vault or cloud secret manager
secret rotation automation
per-tenant API key management
```

---

# 14. API Security Controls

Minimum API controls:

```text
auth middleware
permission guard
tenant guard
request validation
body size limits
file upload limits
rate limiting for auth/upload/search
structured error responses
request_id/correlation_id
security audit for denied critical actions
```

Denied responses should not leak sensitive existence information.

For cross-tenant resources, prefer:

```text
404 or generic 403
```

---

# 15. Worker Security

Workers must:

```text
validate job tenant/workspace context
not process jobs without registry records
not trust raw job payloads
write status transitions safely
log failures with correlation_id
create tickets for repeated failures
respect file size and type restrictions
```

Workers must not:

```text
execute macros
run embedded scripts
write outside allowed storage prefixes
process cross-tenant objects
```

---

# 16. Security Testing Matrix

| Test | Expected |
|---|---|
| Unauthenticated API call | 401 |
| Viewer uploads file | 403 |
| Viewer accesses Admin API | 403 |
| User accesses another tenant file | 403/404 |
| Search restricted knowledge area | No result / denied |
| AI requests purge | Denied |
| AI changes permissions | Denied |
| Execute unapproved plan | Denied |
| Execute without snapshot | Denied/fails safe |
| Path traversal filename | Rejected/sanitized |
| Oversized upload | Rejected |
| Unsupported file | Safe failure |

---

# 17. Security KPIs

Stats & Insights should eventually track:

```text
permission denial count
failed login count
cross-tenant access attempts
AI denied action count
upload rejection count
recovery coverage
replay coverage
admin policy changes
security tickets open
```

---

# 18. Launch Blockers

Do not launch if any are true:

```text
[ ] Tenant isolation is incomplete.
[ ] Backend permission enforcement is incomplete.
[ ] Search can leak restricted files.
[ ] AI can perform forbidden actions.
[ ] Execution can run without approval.
[ ] Execution can run without recovery snapshot.
[ ] File upload lacks size/type validation.
[ ] Path traversal is possible.
[ ] Secrets are committed.
[ ] Trash/restore is missing.
[ ] Audit events are missing for critical operations.
```

---

# 19. Implementation Targets

```text
packages/security/securityPolicy.ts
packages/security/aiAuthority.ts
packages/security/uploadValidation.ts
packages/security/auditEventTypes.ts

apps/api/src/auth/authMiddleware.ts
apps/api/src/auth/permissionGuard.ts
apps/api/src/auth/tenantGuard.ts
apps/api/src/security/rateLimitMiddleware.ts
apps/api/src/security/requestValidation.ts
apps/api/src/security/uploadValidation.ts
apps/api/src/audit/auditService.ts

services/ingestion/src/security/fileValidationService.ts
services/execution/src/security/executionPolicyValidator.ts
services/recovery/src/security/recoveryPolicyValidator.ts
services/retrieval/src/security/searchGovernanceFilter.ts
services/runtime/src/security/aiAuthorityGuard.ts

tests/security/tenantIsolation.test.ts
tests/security/permissionGuard.test.ts
tests/security/aiAuthority.test.ts
tests/security/uploadValidation.test.ts
tests/security/searchGovernanceFilter.test.ts
```
