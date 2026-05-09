# Search & Explore Wiki Knowledge Base

## Purpose

Search & Explore is the primary daily user experience of EverythingAI. It should behave like an enterprise cognitive wiki interface where users can search, browse, verify, and understand knowledge with source references.

It is not only a search page. It is the trusted front door into the enterprise knowledge ecosystem.

## Core principle

Search must always show:

```text
source
context
confidence
governance
recovery status
related knowledge
```

A user should never feel that an AI answer is disconnected from real files.

## Page structure

```text
Search & Explore
  ├── Search Bar
  ├── Knowledge Areas
  ├── Semantic Collections
  ├── Featured / Canonical Documents
  ├── Recent Knowledge
  ├── AI Knowledge Answer
  ├── Search Results
  ├── Related Knowledge Panel
  └── Trust / Governance Panel
```

## Search modes

MVP should support:

- Semantic search
- Keyword search
- Filename search
- Knowledge area filter

Later:

- Relationship search
- Timeline search
- Ticket search
- Governance/replay search

## Knowledge Area layout

Knowledge areas should behave like structured internal wiki pages.

Example:

```text
Engineering
  ├── Overview
  ├── Manuals
  ├── Procedures
  ├── Specifications
  ├── Suppliers
  ├── Maintenance
  ├── Related Tickets
  ├── Canonical Documents
  └── Recently Updated
```

## Knowledge Area object

```json
{
  "knowledge_area_id": "tenant-area-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "name": "Engineering",
  "description": "Engineering manuals, specifications, procedures and technical documentation.",
  "parent_area_id": null,
  "visibility": "restricted | internal | public",
  "governance_policy_id": "policy-id",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Semantic Collection object

Semantic collections are not physical folders. They are AI-discovered or user-curated contextual groups.

```json
{
  "collection_id": "tenant-collection-uuid",
  "tenant_id": "tenant-id",
  "workspace_id": "workspace-id",
  "name": "Vacuum Conveying",
  "description": "Documents related to vacuum conveying systems, SVRs, blowers and material transport.",
  "collection_type": "ai_generated | user_created | governed",
  "confidence_score": 0.92,
  "governance_status": "draft | verified | deprecated",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Search result contract

```json
{
  "result_id": "result-uuid",
  "file_id": "file-uuid",
  "document_id": "document-uuid",
  "title": "LT1_Blower_Manual.pdf",
  "summary": "Primary manual for LT1 blower operation and maintenance.",
  "knowledge_area": "Engineering > Conveying > Blowers",
  "semantic_collections": ["Vacuum Conveying", "Blower Systems"],
  "original_location": "/external/engineering/LT1_Blower_Manual.pdf",
  "internal_location": "/tenant/workspace/raw/files/LT1_Blower_Manual.pdf",
  "source_mode": "copy",
  "source_of_truth": "external",
  "confidence_score": 0.94,
  "governance_status": "verified",
  "recovery_status": "protected",
  "last_updated": "timestamp"
}
```

## Result card UX

Example:

```text
LT1_Blower_Manual.pdf

Engineering > Conveying > Blowers

Summary:
Primary manual for LT1 blower operation and maintenance.

Source:
External file indexed and copied into ecosystem.

Trust:
Verified · Replay available · Recovery protected

Related:
Maintenance checklist · Spare parts sheet · Supplier invoice
```

## AI answers with file references

Rule:

```text
No sourced answer without file references when source knowledge exists.
```

Example:

```text
Answer:
The LT1 blower maintenance interval is described in the LT1 blower manual and the maintenance checklist.

Sources:
1. LT1_Blower_Manual.pdf
2. Maintenance_Checklist_LT1.docx
3. SpareParts_LT1.xlsx
```

## Document context panel

When opening a document, show:

```text
Document Context
  ├── Summary
  ├── Metadata
  ├── Related Documents
  ├── Semantic Collections
  ├── Tickets
  ├── Lineage
  ├── Recovery Status
  └── Governance Status
```

## Relationship panel

For every document, show related knowledge:

```text
Similar documents
Referenced documents
Duplicate candidates
Same supplier
Same project
Same equipment
Same workflow
```

## Canonical documents

The system should identify likely canonical versions.

Example:

```text
Canonical Document:
LT1_Blower_Manual_v5.pdf

Older versions:
LT1_Blower_Manual_v2.pdf
LT1_Blower_Manual_FINAL.pdf
LT1_Blower_Manual_old.pdf
```

AI may recommend canonical marking, but governance controls final marking when required.

## Permission and governance filtering

Search results must be filtered by:

```text
tenant_id
workspace_id
role permissions
knowledge area access
file sensitivity
retention policy
source mode policy
```

Backend enforcement is mandatory.

## Recommended endpoints

```text
GET  /search
GET  /search/suggest
GET  /knowledge-areas
GET  /knowledge-areas/:id
GET  /semantic-collections
GET  /documents/:id/context
GET  /documents/:id/relationships
GET  /documents/:id/lineage
GET  /documents/:id/references
POST /documents/:id/mark-canonical
POST /documents/:id/report-issue
```

## Implementation targets

```text
packages/search/searchResultContract.ts
packages/search/searchQueryContract.ts
packages/knowledge/knowledgeArea.ts
packages/knowledge/semanticCollection.ts
packages/knowledge/documentContext.ts

services/retrieval/src/semanticSearchService.ts
services/retrieval/src/hybridSearchService.ts
services/retrieval/src/searchGovernanceFilter.ts
services/topology/src/documentRelationshipService.ts
services/topology/src/canonicalDocumentService.ts
services/knowledge/src/knowledgeAreaService.ts
services/knowledge/src/semanticCollectionService.ts

apps/api/src/search/search.controller.ts
apps/api/src/knowledge/knowledge.controller.ts
apps/api/src/documents/documentContext.controller.ts

apps/web/src/search/SearchExplorePage.tsx
apps/web/src/search/SearchResultCard.tsx
apps/web/src/search/ReferencePanel.tsx
apps/web/src/knowledge/KnowledgeAreaPage.tsx
apps/web/src/documents/DocumentContextPanel.tsx
```
