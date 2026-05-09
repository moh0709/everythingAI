# Operations, Tickets, Stats, and Insights

## Purpose

EverythingAI must be self-observing. The platform should detect operational problems, create tickets, measure health, generate insights, and show clear KPIs.

This turns the system from a passive knowledge base into a continuous improvement environment.

## Core principle

Every operational problem should become visible, traceable, and actionable.

Examples:

```text
extraction failures create tickets
retrieval gaps create tickets
governance anomalies create tickets
duplicate explosions create tickets
semantic drift creates tickets
recovery failures create tickets
runtime degradation creates tickets
```

## Operations Center

Page structure:

```text
Operations Center
  ├── Operational Health
  ├── Active Tickets
  ├── AI-Generated Tickets
  ├── System Alerts
  ├── Workflow Issues
  ├── Knowledge Quality Issues
  ├── Governance Issues
  ├── Recovery Issues
  └── Improvement Proposals
```

MVP starts with:

```text
Active Tickets
AI-Generated Tickets
Extraction Failures
Runtime Health
Improvement Proposals
```

## Ticket types

| Ticket type | Purpose |
|---|---|
| bug | Something failed |
| extraction_issue | File processing problem |
| retrieval_gap | Users cannot find knowledge |
| duplicate_issue | Duplicate or obsolete content |
| topology_gap | Missing relationships |
| governance_issue | Approval/replay/policy problem |
| recovery_issue | Restore/snapshot problem |
| security_issue | Suspicious behavior |
| improvement | Proposed optimization |
| user_support | Human support request |

## Ticket object

```json
{
  "ticket_id": "tenant-ticket-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "ticket_type": "extraction_issue | retrieval_gap | improvement | bug",
  "title": "OCR extraction failed for 12 engineering PDFs",
  "description": "OCR worker failed repeatedly on scanned engineering documents.",
  "severity": "low | medium | high | critical",
  "status": "open | triaged | in_progress | resolved | rejected",
  "source": "user | ai-agent | system | monitoring",
  "created_by": "user-id | agent-id | system",
  "related_file_ids": [],
  "related_execution_id": null,
  "related_kpi": "extraction_failure_rate",
  "recommendation": "Retry extraction with OCR fallback enabled.",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Ticket lifecycle

```text
created
  -> triaged
  -> assigned
  -> in_progress
  -> resolved
  -> verified
  -> closed
```

Optional states:

```text
rejected
duplicate
converted_to_plan
```

## AI assessment object

AI-generated tickets should include evidence and confidence.

```json
{
  "assessment_id": "tenant-assessment-uuid",
  "ticket_id": "ticket-id",
  "agent_id": "operations-agent",
  "confidence_score": 0.88,
  "evidence": [
    "extraction_failure_rate increased to 18%",
    "12 PDFs failed OCR",
    "worker logs show timeout"
  ],
  "risk_assessment": "medium",
  "recommended_actions": [
    "retry OCR with fallback",
    "increase worker timeout",
    "create extraction quality test"
  ],
  "created_at": "timestamp"
}
```

## Operations health signals

Monitor:

| Signal | Purpose |
|---|---|
| queue depth | runtime pressure |
| extraction failures | processing health |
| failed searches | retrieval gaps |
| duplicate growth | knowledge health |
| replay gaps | governance risk |
| restore failures | recovery risk |
| permission failures | security risk |
| worker uptime | stability |

## Stats & Insights

Stats & Insights proves value and platform health.

Page structure:

```text
Stats & Insights
  ├── Executive Summary
  ├── Knowledge Health
  ├── Search & Retrieval Quality
  ├── Governance Trust
  ├── Recovery Readiness
  ├── Operations Health
  ├── AI Impact
  ├── Trends
  └── Recommendations
```

MVP starts with:

```text
Knowledge Health
Retrieval Quality
Recovery Readiness
Operations Health
```

## KPI categories

### Knowledge Health

| KPI | Meaning |
|---|---|
| total indexed files | system coverage |
| extracted documents | extraction progress |
| duplicate ratio | organization quality |
| orphaned knowledge count | topology gaps |
| canonical document coverage | version clarity |
| missing metadata ratio | ingestion quality |

### Retrieval Quality

| KPI | Meaning |
|---|---|
| search success rate | users find what they need |
| failed searches | missing knowledge or poor indexing |
| average retrieval confidence | semantic quality |
| average search latency | performance |
| top searched topics | enterprise demand |
| unused knowledge count | hidden or low-value content |

### Governance Trust

| KPI | Meaning |
|---|---|
| replay coverage | explainability |
| approval latency | governance friction |
| policy violations | governance risk |
| execution approval rate | trust in AI plans |
| rejected plan ratio | AI proposal quality |

### Recovery Readiness

| KPI | Meaning |
|---|---|
| trashbin protection rate | safety coverage |
| rollback availability | recovery trust |
| restore success rate | operational resilience |
| purge pending count | lifecycle management |
| recovery snapshot coverage | execution safety |

### Operations Health

| KPI | Meaning |
|---|---|
| extraction failure rate | pipeline quality |
| queue depth | runtime load |
| worker uptime | operational stability |
| embedding latency | AI processing health |
| ticket resolution time | operations maturity |

## Health scores

Recommended scores:

```text
Knowledge Health Score
Retrieval Quality Score
Governance Trust Score
Recovery Readiness Score
Operational Stability Score
AI Impact Score
```

Scores must be explainable.

## Insight object

```json
{
  "insight_id": "tenant-insight-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "insight_type": "knowledge_health | retrieval | governance | recovery | operations",
  "severity": "info | low | medium | high | critical",
  "title": "Duplicate engineering manuals increased",
  "description": "Duplicate ratio increased by 12% in Engineering this week.",
  "recommended_action": "Run duplicate cleanup planning for Engineering.",
  "related_kpi": "duplicate_ratio",
  "created_by": "system | ai-agent",
  "created_at": "timestamp"
}
```

## Metric object

```json
{
  "metric_id": "tenant-metric-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "metric_name": "duplicate_ratio",
  "metric_category": "knowledge_health",
  "value": 0.14,
  "unit": "ratio",
  "period": "daily",
  "calculated_at": "timestamp",
  "trend": "up | down | stable"
}
```

## APIs

Operations:

```text
GET  /tickets
POST /tickets
GET  /tickets/:id
PATCH /tickets/:id
POST /tickets/:id/comment
POST /tickets/:id/resolve
POST /tickets/:id/reject
POST /tickets/:id/convert-to-plan
GET  /operations/health
GET  /operations/signals
GET  /operations/alerts
POST /operations/scan
```

Insights:

```text
GET /insights/summary
GET /insights/kpis
GET /insights/kpis/:category
GET /insights/trends
GET /insights/recommendations
POST /insights/:id/create-ticket
GET /insights/health-score
GET /insights/export
```

## Implementation targets

```text
packages/tickets/ticketContract.ts
packages/tickets/ticketLifecycle.ts
packages/tickets/aiAssessmentContract.ts
packages/operations/healthSignalContract.ts
packages/insights/kpiContract.ts
packages/insights/insightContract.ts
packages/insights/healthScoreContract.ts

services/operations/src/ticketIntelligenceService.ts
services/operations/src/aiAssessmentService.ts
services/operations/src/operationalHealthService.ts
services/operations/src/anomalyDetectionService.ts
services/operations/src/improvementProposalService.ts
services/insights/src/knowledgeHealthService.ts
services/insights/src/retrievalAnalyticsService.ts
services/insights/src/governanceInsightsService.ts
services/insights/src/recoveryInsightsService.ts
services/insights/src/operationsMetricsService.ts

apps/web/src/operations/OperationsCenterPage.tsx
apps/web/src/operations/TicketCard.tsx
apps/web/src/insights/StatsInsightsPage.tsx
apps/web/src/insights/KpiCard.tsx
apps/web/src/insights/HealthScorePanel.tsx
```
