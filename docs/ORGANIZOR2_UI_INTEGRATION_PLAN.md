# ORGANIZOR2 UI INTEGRATION PLAN

## Decision

Organizor2 should become the main user-facing application layer for EverythingAI.

The current `services/api/public` UI is useful as a technical prototype, but the real MVP should use the Organizor2 workflow and visual structure as the primary app experience.

## Source reference

Organizor2 repository:

```text
https://github.com/moh0709/Organizor2.git
```

Current Organizor2 stack:

```text
React
TypeScript
Vite
TailwindCSS
Lucide icons
Recharts
Zod
Jest
```

## Why Organizor2 should become the main UI

Organizor2 already matches the desired user experience:

```text
Dashboard → Explorer → Planning → Analytics → Settings
```

It feels like a real product instead of a technical admin dashboard.

It already expresses the correct product flow:

```text
Upload/select files or folders
→ AI analyzes files
→ User explores files
→ User creates an organization plan
→ User reviews analytics/logs
→ User configures AI and safety settings
```

This is much closer to the final EverythingAI MVP than the current static local dashboard.

## Integration strategy

Do not copy only the visual style.

Use Organizor2 as the frontend application shell and connect it to the current EverythingAI backend API.

Recommended architecture:

```text
Organizor2 React UI
  ↓
EverythingAI API client adapter
  ↓
services/api Express backend
  ↓
SQLite local MVP database
  ↓
local filesystem indexing / extraction / search / planning / safe execution
```

## What should be reused from Organizor2

### UI structure

Reuse these sections as the primary MVP screens:

- Dashboard
- Explorer
- Planning
- Analytics
- Settings

### Visual language

Reuse:

- blue/white clean layout
- top navigation
- cards
- stat cards
- upload/processing hub
- file explorer table with right-side details panel
- planning center
- analytics dashboard
- advanced settings layout
- Ollama provider badge

### Workflow language

Reuse:

- AI File Intelligence Center
- AI File Processing Hub
- AI File Explorer
- AI Planning Center
- Logging & Analytics Dashboard
- Advanced Settings

## What should be replaced/adapted

Organizor2 currently does browser-side file processing and uses browser file APIs.

EverythingAI should replace that with backend-powered processing:

```text
Organizor2 file upload/folder selection UI
  ↓
POST /api/index
  ↓
POST /api/extract
  ↓
POST /api/embeddings
  ↓
POST /api/insights
  ↓
POST /api/suggestions
```

The frontend should not become the source of truth.

The backend remains the source of truth for:

- indexed files
- extracted text
- embeddings
- insights
- suggestions
- previews
- executions
- audit logs

## Endpoint mapping

| Organizor2 screen | EverythingAI backend endpoint |
|---|---|
| Dashboard upload/select folder | `POST /api/select-folder`, `POST /api/index` |
| Dashboard stats | `GET /api/status`, `GET /api/files` |
| Explorer file list | `GET /api/files` |
| Explorer search | `GET /api/search`, `GET /api/unified-search` |
| Explorer selected file details | `GET /api/files/:fileId/preview` |
| Planning AI analysis | `POST /api/suggestions`, `GET /api/suggestions` |
| Planning dry run preview | `POST /api/action-previews` |
| Planning execute plan | `POST /api/action-executions` |
| Analytics logs | `GET /api/audit-log`, `GET /api/action-executions` |
| Settings provider config | `GET /api/provider-settings`, `PUT /api/provider-settings` |
| Duplicates / analytics | `GET /api/duplicates` |
| Knowledge | `GET /api/knowledge`, `POST /api/knowledge/build` |
| Chat / AI ask | `POST /api/chat` |

## Recommended implementation path

### Phase 1 — Import frontend shell

Create a new frontend app inside EverythingAI:

```text
apps/organizor-ui
```

or, for faster MVP integration:

```text
services/api/web
```

Recommended for now:

```text
apps/organizor-ui
```

Reason:

This keeps the frontend clean and avoids mixing React/Vite code with the Express static prototype.

### Phase 2 — Add API client adapter

Create:

```text
apps/organizor-ui/src/services/everythingApi.ts
```

This adapter should wrap all backend calls.

The UI should not call raw endpoints directly from components.

### Phase 3 — Replace browser-only processing

Update Organizor2 logic so:

- folder selection calls the EverythingAI local API
- file list comes from SQLite backend
- stats come from backend status/files endpoints
- plan comes from backend suggestions/previews
- execution calls backend approval endpoints
- audit comes from backend audit log

### Phase 4 — Keep safety workflow intact

The frontend must never directly move/rename/delete files.

The only allowed workflow is:

```text
Suggestion → Preview → User confirmation → Execute approved action → Audit log → Undo available
```

### Phase 5 — Build and serve

For local MVP, Vite can run separately during development:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4100
```

Later, build output can be served by the Express backend:

```text
apps/organizor-ui/dist → services/api static hosting
```

## What happens to current static UI

The current `services/api/public` UI should remain temporarily as a debug/admin fallback.

Eventually it can become:

```text
/debug
```

The Organizor2 UI should become:

```text
/
```

## MVP target after integration

The user opens EverythingAI and sees the Organizor2-style dashboard.

Main flow:

```text
Open app
→ Select/upload folder
→ AI processing hub runs backend pipeline
→ Dashboard stats update
→ Explorer shows indexed files
→ Planning shows suggested organization structure
→ User previews actions
→ User approves selected actions
→ Audit/analytics records results
```

## Important rule

Organizor2 becomes the product experience.

EverythingAI backend remains the intelligence, storage, safety, and execution engine.
