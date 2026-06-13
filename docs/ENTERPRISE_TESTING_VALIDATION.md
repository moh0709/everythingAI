# Enterprise Testing & Validation Specification

## Current local MVP relationship

The current local MVP has completed Phase 8.2 CI Smoke Test Integration. The active CI smoke pipeline validates backend tests, frontend typecheck/build, and Playwright smoke coverage for main-branch changes.

This enterprise validation specification remains the future production release gate. It is not replaced by the local CI smoke pipeline.

## Purpose

This document defines how EverythingAI Workspace MVP should be tested before release.

The MVP must not only work technically. It must prove:

```text
security
recoverability
source references
governance
admin control
search quality
safe execution
clear UX
```

Testing must validate the complete enterprise trust loop.

---

# 1. Testing Principles

## 1.1 Test the end-to-end loop first

The highest-priority test path is:

```text
admin creates workspace
  -> user uploads file
  -> system extracts content
  -> user searches file
  -> result shows source reference
  -> AI/system generates plan
  -> plan is simulated
  -> plan is approved
  -> execution creates recovery snapshot
  -> file moves to trash
  -> file restores successfully
  -> audit events exist
  -> operations ticket/health updates appear
  -> stats page updates KPIs
```

## 1.2 Security tests are release blockers

Do not release if backend permission enforcement or tenant isolation is incomplete.

## 1.3 Recovery tests are release blockers

Do not release if destructive actions cannot be restored.

## 1.4 Source reference tests are release blockers

Do not release if search and AI answers do not show filename/source references.

---

# 2. Test Types

## Unit Tests

Validate isolated logic:

```text
permission checks
source mode validation
file registry status transitions
retention date calculation
plan risk calculation
execution policy validation
search result contract shaping
KPI calculation
```

## Integration Tests

Validate services together:

```text
upload -> registry
registry -> extraction
extraction -> chunks
chunks -> search
planning -> simulation
approval -> execution
execution -> snapshot
trash -> restore
failure -> ticket
metrics -> insights
```

## End-to-End Tests

Validate user-facing flows:

```text
onboarding
upload/search
planning/simulation
execution/recovery
admin access control
operations/tickets
stats/insights
```

## Security Tests

Validate:

```text
unauthenticated access denied
wrong tenant access denied
missing capability denied
frontend hidden pages are still backend protected
AI actor cannot exceed AI permissions
purge cannot be performed by AI
normal user cannot access admin APIs
```

## UX Smoke Tests

Validate:

```text
navigation respects permissions
search result cards show source references
planning page shows before/after preview
recovery page shows retention countdown
operations page shows tickets
stats page shows KPI cards
empty states are clear
```

---

# 3. MVP Smoke Test Checklist

## 3.1 Auth and Admin

```text
[ ] User can authenticate.
[ ] /auth/me returns user, tenant, roles, permissions, workspaces.
[ ] Admin can view users.
[ ] Admin can update role permissions.
[ ] Viewer cannot access Admin Console APIs.
[ ] Page access matrix changes navigation visibility.
[ ] Backend still denies hidden-page APIs if permission is missing.
```

## 3.2 Workspace and Onboarding

```text
[ ] Tenant can be created or selected.
[ ] Workspace can be created.
[ ] Workspace has default source mode.
[ ] Reference Mode and Copy Mode are available.
[ ] Managed Mode is disabled by default.
[ ] Safety review shows retention and AI execution settings.
```

## 3.3 File Upload and Registry

```text
[ ] User can upload PDF.
[ ] User can upload DOCX.
[ ] User can upload TXT.
[ ] User can upload CSV/XLSX.
[ ] Uploaded file creates file registry entry.
[ ] File registry includes tenant_id, workspace_id, source_mode, source_of_truth.
[ ] File registry includes original/internal location where applicable.
[ ] Unsupported file type is handled safely.
[ ] Oversized file is rejected safely.
[ ] Upload creates audit event.
```

## 3.4 Extraction

```text
[ ] PDF text extraction works.
[ ] DOCX text extraction works.
[ ] TXT extraction works.
[ ] CSV/XLSX extraction works.
[ ] PNG/JPG OCR baseline works or fails gracefully.
[ ] Failed extraction creates visible status.
[ ] Failed extraction can create an operations ticket.
[ ] Extracted document keeps source file reference.
```

## 3.5 Search & Explore

```text
[ ] Search returns indexed files.
[ ] Search result shows filename.
[ ] Search result shows source location/reference.
[ ] Search result shows source mode.
[ ] Search result shows recovery status.
[ ] Search result shows governance status.
[ ] Document context panel opens.
[ ] Knowledge area filter works.
[ ] Search respects tenant and workspace permissions.
[ ] Search query creates search log.
```

## 3.6 Planning

```text
[ ] System can generate organization plan.
[ ] System can generate duplicate cleanup plan baseline.
[ ] System can generate canonical recommendation baseline.
[ ] Plan actions include reasons.
[ ] Plan has confidence score and risk level.
[ ] Plan can be simulated.
[ ] Simulation shows affected files.
[ ] Simulation shows rollback availability.
[ ] Plan cannot execute before approval.
```

## 3.7 Execution

```text
[ ] Approved plan can be queued.
[ ] Execution validates permission.
[ ] Execution validates policy.
[ ] Execution creates recovery snapshot before action.
[ ] Execution creates audit event.
[ ] Execution creates replay reference.
[ ] Execution updates file registry.
[ ] Execution updates search/index references where needed.
[ ] Failed execution creates ticket.
```

## 3.8 Recovery

```text
[ ] File can move to trash.
[ ] Trash record includes retention_until.
[ ] Default retention is 30 days.
[ ] Restore simulation works.
[ ] File can be restored from trash.
[ ] Restore creates audit event.
[ ] Purge requires approval.
[ ] AI cannot purge.
[ ] Audit/replay remains after purge request/purge.
```

## 3.9 Operations

```text
[ ] User can create ticket.
[ ] System can create ticket from extraction failure.
[ ] AI-generated ticket includes evidence/confidence.
[ ] Ticket lifecycle works: open -> triaged -> in_progress -> resolved.
[ ] Operations Center shows health signals.
[ ] Operations Center shows active tickets.
```

## 3.10 Stats & Insights

```text
[ ] Indexed file count is calculated.
[ ] Extraction success rate is calculated.
[ ] Failed search count is calculated.
[ ] Trashbin protected file count is calculated.
[ ] Open ticket count is calculated.
[ ] Recovery readiness is calculated.
[ ] KPI cards render.
[ ] Insight can create ticket.
```

---

# 4. Security Validation Matrix

| Scenario | Expected result |
|---|---|
| Unauthenticated request to protected endpoint | 401 |
| Viewer calls upload endpoint | 403 |
| Viewer calls admin endpoint | 403 |
| User accesses another tenant file | 403 or 404 |
| User searches restricted knowledge area | hidden/denied |
| AI actor requests purge | denied |
| AI actor changes permissions | denied |
| Operator executes unapproved plan | denied |
| Admin changes retention | allowed + audit event |
| Admin changes AI permissions | allowed + audit event |

---

# 5. Recovery Validation Matrix

| Scenario | Expected result |
|---|---|
| Move file to trash | trash record created |
| Restore trashed file | file active again |
| Restore expired trash item | denied or requires admin flow |
| Execute plan | recovery snapshot created first |
| Rollback execution | previous state restored |
| Purge file content | audit/replay metadata preserved |
| AI attempts permanent purge | denied |

---

# 6. Source Reference Validation

Every search result and sourced answer must include:

```text
filename
file_id
original_location or internal_location
source_mode
source_of_truth
last_updated
confidence or relevance score
```

If the system cannot provide references, it must clearly say that references are unavailable.

---

# 7. Test Data Set

Create a small test dataset:

```text
test-data/
  engineering/
    LT1_Blower_Manual_v5.pdf
    LT1_Blower_Manual_old.pdf
    Maintenance_Checklist_LT1.docx
    SpareParts_LT1.xlsx
  suppliers/
    Supplier_Invoice_LT1.pdf
  operations/
    Alarm_Reset_Procedure.txt
  images/
    Scanned_Manual_Page.jpg
```

Include duplicates and older versions to test planning and canonical recommendations.

---

# 8. Suggested Test Commands

For the existing local MVP:

```bash
cd services/api
npm test
npm audit --omit=dev
npm run index -- "C:\path\to\test-data"
npm run extract
npm run search -- "LT1 blower maintenance"
npm run duplicates
npm run insights -- --limit 25
```

For future enterprise services, add:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:smoke
```

---

# 9. Launch Validation Checklist

MVP can launch only when:

```text
[ ] Auth works.
[ ] Tenant isolation works.
[ ] Admin page/capability control works.
[ ] Upload works.
[ ] Extraction works for MVP file types.
[ ] Search shows source references.
[ ] Planning simulation works.
[ ] Execution requires approval.
[ ] Execution creates recovery snapshot.
[ ] Trashbin restore works.
[ ] Operations tickets work.
[ ] Stats KPIs work.
[ ] Audit events exist for critical actions.
[ ] AI cannot bypass governance.
```

---

# 10. Release Blockers

Do not release if any are true:

```text
[ ] Search results lack source references.
[ ] Backend permission checks are incomplete.
[ ] Tenant isolation is incomplete.
[ ] Delete/trash cannot be restored.
[ ] Execution can run without approval.
[ ] Recovery snapshot is not created before execution.
[ ] Admin access control is missing.
[ ] AI can perform restricted actions.
[ ] Audit events are missing for critical operations.
```

---

# 11. Implementation Targets

```text
tests/unit/permissions.test.ts
tests/unit/sourceMode.test.ts
tests/unit/retentionPolicy.test.ts
tests/unit/searchResultContract.test.ts
tests/unit/planningSimulation.test.ts
tests/unit/executionPolicy.test.ts
tests/integration/uploadExtractSearch.test.ts
tests/integration/planningExecutionRecovery.test.ts
tests/integration/adminAccessControl.test.ts
tests/integration/operationsInsights.test.ts
tests/e2e/mvpCoreLoop.spec.ts
tests/security/tenantIsolation.test.ts
tests/security/aiAuthority.test.ts
```
