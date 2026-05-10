# Enterprise Schema Contracts

## Purpose

This document defines the MVP data contracts for the EverythingAI Workspace platform.

The goal is to give implementation agents a concrete schema foundation for:

- tenants
- workspaces
- users
- roles
- permissions
- file registry
- extracted documents
- chunks
- search references
- knowledge areas
- semantic collections
- plans
- executions
- recovery
- tickets
- insights
- audit events

These contracts should be implemented first as TypeScript interfaces and then mapped to database tables/migrations.

---

# 1. Core Identity & Tenant Contracts

## Tenant

```ts
export interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}
```

## Workspace

```ts
export interface Workspace {
  workspace_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  default_source_mode: 'reference' | 'copy' | 'managed';
  retention_policy_id?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}
```

## User

```ts
export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}
```

## Role

```ts
export interface Role {
  role_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}
```

## Permission

```ts
export interface Permission {
  permission_id: string;
  key: string;
  description?: string;
  category: 'page' | 'capability' | 'workspace' | 'knowledge_area' | 'admin' | 'ai';
}
```

## RolePermission

```ts
export interface RolePermission {
  role_permission_id: string;
  tenant_id: string;
  role_id: string;
  permission_key: string;
  granted: boolean;
  created_at: string;
}
```

---

# 2. File Registry & Ingestion Contracts

## FileRegistryEntry

```ts
export interface FileRegistryEntry {
  file_id: string;
  tenant_id: string;
  workspace_id: string;
  source_mode: 'reference' | 'copy' | 'managed';
  source_of_truth: 'external' | 'internal';
  original_location?: string;
  internal_location?: string;
  filename: string;
  extension?: string;
  mime_type?: string;
  checksum?: string;
  size_bytes?: number;
  status: 'discovered' | 'registered' | 'ingested' | 'extracted' | 'indexed' | 'active' | 'trash' | 'archived' | 'purged' | 'failed';
  ingestion_status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  extraction_status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  recovery_status: 'protected' | 'not_protected' | 'trash' | 'purged';
  governance_status: 'draft' | 'verified' | 'requires_review' | 'rejected';
  retention_until?: string | null;
  created_at: string;
  updated_at: string;
}
```

## ExtractedDocument

```ts
export interface ExtractedDocument {
  document_id: string;
  tenant_id: string;
  workspace_id: string;
  file_id: string;
  extracted_text: string;
  metadata_json: Record<string, unknown>;
  extraction_engine: string;
  extraction_confidence?: number;
  language?: string;
  created_at: string;
  updated_at: string;
}
```

## DocumentChunk

```ts
export interface DocumentChunk {
  chunk_id: string;
  tenant_id: string;
  workspace_id: string;
  document_id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
  checksum?: string;
  heading_path?: string[];
  created_at: string;
}
```

## EmbeddingReference

```ts
export interface EmbeddingReference {
  embedding_id: string;
  tenant_id: string;
  workspace_id: string;
  chunk_id: string;
  vector_id: string;
  embedding_model: string;
  dimensions?: number;
  created_at: string;
}
```

---

# 3. Knowledge Organization Contracts

## KnowledgeArea

```ts
export interface KnowledgeArea {
  knowledge_area_id: string;
  tenant_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  parent_area_id?: string | null;
  visibility: 'restricted' | 'internal' | 'public';
  governance_policy_id?: string;
  created_at: string;
  updated_at: string;
}
```

## SemanticCollection

```ts
export interface SemanticCollection {
  collection_id: string;
  tenant_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  collection_type: 'ai_generated' | 'user_created' | 'governed';
  confidence_score?: number;
  governance_status: 'draft' | 'verified' | 'deprecated';
  created_at: string;
  updated_at: string;
}
```

## FileKnowledgeAreaAssignment

```ts
export interface FileKnowledgeAreaAssignment {
  assignment_id: string;
  tenant_id: string;
  workspace_id: string;
  file_id: string;
  knowledge_area_id: string;
  assigned_by_type: 'user' | 'ai-agent' | 'system';
  assigned_by_id?: string;
  confidence_score?: number;
  created_at: string;
}
```

## FileSemanticCollectionAssignment

```ts
export interface FileSemanticCollectionAssignment {
  assignment_id: string;
  tenant_id: string;
  workspace_id: string;
  file_id: string;
  collection_id: string;
  assigned_by_type: 'user' | 'ai-agent' | 'system';
  assigned_by_id?: string;
  confidence_score?: number;
  created_at: string;
}
```

## DocumentRelationship

```ts
export interface DocumentRelationship {
  relationship_id: string;
  tenant_id: string;
  workspace_id: string;
  source_file_id: string;
  target_file_id: string;
  relationship_type: 'related_to' | 'duplicate_of' | 'supersedes' | 'references' | 'same_project' | 'same_supplier' | 'same_equipment' | 'derived_from';
  confidence_score?: number;
  reason?: string;
  created_by_type: 'user' | 'ai-agent' | 'system';
  created_at: string;
}
```

---

# 4. Search & Discovery Contracts

## SearchQueryLog

```ts
export interface SearchQueryLog {
  search_id: string;
  tenant_id: string;
  workspace_id: string;
  user_id?: string;
  query: string;
  search_type: 'keyword' | 'semantic' | 'hybrid' | 'filename';
  result_count: number;
  success: boolean;
  latency_ms?: number;
  created_at: string;
}
```

## SearchResultContract

```ts
export interface SearchResultContract {
  result_id: string;
  file_id: string;
  document_id?: string;
  title: string;
  summary?: string;
  knowledge_area?: string;
  semantic_collections?: string[];
  original_location?: string;
  internal_location?: string;
  source_mode: 'reference' | 'copy' | 'managed';
  source_of_truth: 'external' | 'internal';
  confidence_score?: number;
  governance_status: string;
  recovery_status: string;
  last_updated: string;
}
```

---

# 5. Planning Contracts

## Plan

```ts
export interface Plan {
  plan_id: string;
  tenant_id: string;
  workspace_id: string;
  plan_type: 'organization' | 'duplicate_cleanup' | 'canonicalization' | 'collection_creation' | 'ticket_plan';
  title: string;
  description?: string;
  status: 'draft' | 'simulated' | 'pending_approval' | 'approved' | 'executed' | 'rejected' | 'failed';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score?: number;
  blast_radius_json?: Record<string, unknown>;
  rollback_available: boolean;
  requires_approval: boolean;
  created_by_type: 'user' | 'ai-agent' | 'system';
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}
```

## PlanAction

```ts
export interface PlanAction {
  action_id: string;
  tenant_id: string;
  workspace_id: string;
  plan_id: string;
  action_type: 'move' | 'copy' | 'archive' | 'tag' | 'mark_canonical' | 'create_collection' | 'create_ticket' | 'assign_knowledge_area';
  target_file_id?: string;
  current_state_json: Record<string, unknown>;
  proposed_state_json: Record<string, unknown>;
  reason: string;
  confidence_score?: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  rollback_available: boolean;
  created_at: string;
}
```

## SimulationResult

```ts
export interface SimulationResult {
  simulation_id: string;
  tenant_id: string;
  workspace_id: string;
  plan_id: string;
  status: 'completed' | 'failed';
  files_affected: number;
  estimated_duration_seconds?: number;
  rollback_available: boolean;
  recovery_snapshot_required: boolean;
  warnings_json: unknown[];
  governance_requirements_json: unknown[];
  simulated_at: string;
}
```

---

# 6. Execution & Recovery Contracts

## Execution

```ts
export interface Execution {
  execution_id: string;
  tenant_id: string;
  workspace_id: string;
  plan_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'rolled_back';
  approved_by?: string;
  executed_by_type: 'system' | 'ai-agent' | 'user';
  executed_by_id?: string;
  recovery_snapshot_id?: string;
  actions_total: number;
  actions_completed: number;
  actions_failed: number;
  rollback_available: boolean;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}
```

## ExecutionActionResult

```ts
export interface ExecutionActionResult {
  execution_action_id: string;
  tenant_id: string;
  workspace_id: string;
  execution_id: string;
  plan_action_id: string;
  action_type: string;
  target_file_id?: string;
  before_state_json: Record<string, unknown>;
  after_state_json: Record<string, unknown>;
  status: 'completed' | 'failed' | 'skipped';
  error?: string | null;
  rollback_available: boolean;
  executed_at: string;
}
```

## RecoverySnapshot

```ts
export interface RecoverySnapshot {
  snapshot_id: string;
  tenant_id: string;
  workspace_id: string;
  snapshot_type: 'pre_execution' | 'manual' | 'scheduled' | 'retention';
  related_execution_id?: string;
  storage_location: string;
  metadata_location?: string;
  files_count?: number;
  topology_included: boolean;
  index_state_included: boolean;
  governance_state_included: boolean;
  retention_until?: string;
  created_at: string;
  created_by_type: 'system' | 'user';
  created_by_id?: string;
}
```

## TrashRecord

```ts
export interface TrashRecord {
  trash_id: string;
  tenant_id: string;
  workspace_id: string;
  file_id: string;
  filename: string;
  original_internal_location?: string;
  trash_location?: string;
  delete_reason?: string;
  deleted_by_type: 'user' | 'ai-agent' | 'execution' | 'system';
  deleted_by_id?: string;
  execution_id?: string;
  retention_until: string;
  restore_available: boolean;
  status: 'trash' | 'restored' | 'purge_eligible' | 'purged';
  created_at: string;
  updated_at: string;
}
```

---

# 7. Operations & Insights Contracts

## Ticket

```ts
export interface Ticket {
  ticket_id: string;
  tenant_id: string;
  workspace_id: string;
  ticket_type: 'bug' | 'extraction_issue' | 'retrieval_gap' | 'duplicate_issue' | 'topology_gap' | 'governance_issue' | 'recovery_issue' | 'security_issue' | 'improvement' | 'user_support';
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'triaged' | 'in_progress' | 'resolved' | 'rejected' | 'closed';
  source: 'user' | 'ai-agent' | 'system' | 'monitoring';
  created_by?: string;
  related_file_ids?: string[];
  related_execution_id?: string;
  related_kpi?: string;
  recommendation?: string;
  created_at: string;
  updated_at: string;
}
```

## AIAssessment

```ts
export interface AIAssessment {
  assessment_id: string;
  tenant_id: string;
  workspace_id: string;
  ticket_id?: string;
  agent_id: string;
  confidence_score?: number;
  evidence_json: unknown[];
  risk_assessment: 'low' | 'medium' | 'high' | 'critical';
  recommended_actions_json: unknown[];
  created_at: string;
}
```

## KpiMetric

```ts
export interface KpiMetric {
  metric_id: string;
  tenant_id: string;
  workspace_id: string;
  metric_name: string;
  metric_category: 'knowledge_health' | 'retrieval' | 'governance' | 'recovery' | 'operations' | 'ai_impact';
  value: number;
  unit: 'count' | 'ratio' | 'percent' | 'milliseconds' | 'seconds';
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  calculated_at: string;
  trend: 'up' | 'down' | 'stable';
}
```

## Insight

```ts
export interface Insight {
  insight_id: string;
  tenant_id: string;
  workspace_id: string;
  insight_type: 'knowledge_health' | 'retrieval' | 'governance' | 'recovery' | 'operations' | 'ai_impact';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommended_action?: string;
  related_kpi?: string;
  created_by: 'system' | 'ai-agent';
  created_at: string;
}
```

---

# 8. Audit & Event Contracts

## AuditEvent

```ts
export interface AuditEvent {
  audit_event_id: string;
  tenant_id: string;
  workspace_id?: string;
  event_type: string;
  actor_type: 'user' | 'ai-agent' | 'system';
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  payload_json?: Record<string, unknown>;
  replay_reference?: string;
  created_at: string;
}
```

## SystemEvent

```ts
export interface SystemEvent {
  event_id: string;
  tenant_id: string;
  workspace_id?: string;
  event_type: string;
  source_service: string;
  timestamp: string;
  correlation_id?: string;
  actor_type: 'user' | 'ai-agent' | 'system';
  actor_id?: string;
  payload: Record<string, unknown>;
  replayable: boolean;
  schema_version: string;
}
```

---

# 9. MVP Database Priority

Implement database tables in this order:

```text
tenants
workspaces
users
roles
permissions
role_permissions
file_registry
extracted_documents
document_chunks
embedding_references
knowledge_areas
semantic_collections
file_knowledge_area_assignments
file_semantic_collection_assignments
document_relationships
search_query_logs
plans
plan_actions
simulation_results
executions
execution_action_results
recovery_snapshots
trash_records
tickets
ai_assessments
kpi_metrics
insights
audit_events
```

## MVP shortcut allowed

For the first local implementation, some JSON-rich objects may be stored in JSON columns before being normalized further. However, tenant_id, workspace_id, file_id, status, timestamps, and source-mode fields must remain queryable columns.

---

# 10. Launch Blockers

Do not launch without queryable fields for:

```text
tenant_id
workspace_id
file_id
source_mode
source_of_truth
status
recovery_status
governance_status
retention_until
created_at
updated_at
```

Do not launch without audit events for:

```text
file upload
file extraction
search query
plan creation
plan approval
execution start/completion
trash move
restore
permission change
AI-generated ticket
```
