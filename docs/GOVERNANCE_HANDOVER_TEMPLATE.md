# Governance Handover Template

## Purpose

This template operationalizes ADR-005-013: Governance Session Handover, Continuity & Institutional Knowledge Preservation.

Use this artifact whenever a major governance milestone occurs, including:

- phase completion
- governance freeze
- recovery-boundary activation
- enforcement activation
- operational certification
- major architecture restructuring
- governance ownership transfer

The goal is to prevent governance knowledge drift and preserve institutional context across sessions, contributors, and rollout stages.

---

# 1. Handover Metadata

```text
Handover ID:
Date:
Prepared by:
Reviewed by:
Related phase:
Related ADRs:
Related docs:
Repository ref / commit:
Status: draft | reviewed | accepted | superseded
```

---

# 2. Current Governance State

Describe the current governance state clearly.

```text
Current governance state:

Active governance domains:
- runtime governance:
- authorization governance:
- recovery governance:
- operational governance:
- security governance:
- AI authority governance:
```

---

# 3. Rollout Maturity

```text
Current rollout maturity:

BR / rollout stage:
Shadow mode active: yes | no
Enforcement mode active: yes | no
Operational readiness level:
Due diligence level:
Certification status:
```

---

# 4. Active Invariants

List all invariants that must remain protected.

```text
Active invariants:

1.
2.
3.
```

Required MVP invariants include:

```text
Backend permission enforcement is mandatory.
Tenant isolation is mandatory.
AI may propose, but humans govern execution.
Execution requires approval and recovery snapshot.
Delete-like actions move to trash first.
Trash retention defaults to 30 days.
Search results must include source references.
Audit events are required for critical actions.
```

---

# 5. Enforcement Maturity

```text
Enforcement maturity summary:

Policies enforced server-side:
Policies still advisory:
Policies in shadow mode:
Policies blocked from activation:
Known enforcement gaps:
```

---

# 6. Blast-Radius State

```text
Current blast-radius state:

High-risk domains:
Medium-risk domains:
Low-risk domains:
Known containment boundaries:
Execution limits:
AI authority limits:
```

---

# 7. Recovery-Boundary Status

```text
Recovery-boundary status:

Recovery boundary active: yes | no
Recovery snapshots required: yes | no
Rollback tested: yes | no
Trashbin retention active: yes | no
Known recovery risks:
Recovery procedures location:
```

---

# 8. Unresolved Governance Risks

```text
Unresolved governance risks:

| Risk | Severity | Owner | Mitigation | Status |
|---|---|---|---|---|
| | | | | |
```

---

# 9. Operational Readiness Status

```text
Operational readiness:

Health checks ready: yes | no
Audit logs ready: yes | no
Operations tickets ready: yes | no
Stats/KPIs ready: yes | no
Backup procedure ready: yes | no
Restore procedure ready: yes | no
Security validation ready: yes | no
```

---

# 10. Governance Contracts

List contracts that must remain aligned.

```text
Governance contracts:

- schema contracts:
- API contracts:
- access-control contracts:
- execution contracts:
- recovery contracts:
- ticket/operations contracts:
- audit/replay contracts:
```

---

# 11. Critical Architectural Assumptions

```text
Critical assumptions:

1.
2.
3.
```

Examples:

```text
The local MVP remains separate from the future enterprise platform until migration is explicit.
Reference Mode and Copy Mode are MVP-safe source modes.
Managed Mode remains disabled by default.
PostgreSQL/Qdrant/MinIO are the target enterprise runtime services.
AI execution remains disabled unless governance explicitly enables it.
```

---

# 12. Forbidden Patterns

```text
Forbidden patterns:

- bypassing backend permission enforcement
- frontend-only security
- cross-tenant context assembly
- AI permanent purge
- execution without approval
- execution without recovery snapshot
- destructive external file mutation in MVP
- search results without source references
- undocumented governance policy change
```

---

# 13. Next Approved Governance Actions

```text
Next approved governance actions:

1.
2.
3.
```

Each action should include:

```text
owner:
expected artifact:
approval required:
blocking dependencies:
```

---

# 14. Continuity Validation Checklist

Before accepting this handover, verify:

```text
[ ] Architectural assumptions are explicit.
[ ] Governance ownership is clear.
[ ] Rollout state is reconstructable.
[ ] Recovery procedures are accessible.
[ ] Enforcement maturity is traceable.
[ ] Active invariants are preserved.
[ ] Forbidden patterns are documented.
[ ] Next actions are approved and bounded.
```

---

# 15. Acceptance

```text
Prepared by:
Date:

Reviewed by:
Date:

Accepted by:
Date:
```

---

# Final Rule

If governance continuity cannot be validated, governance freeze must be considered until continuity is restored.
