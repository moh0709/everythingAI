# SOURCE SCOPE AUTOMATION MODEL

## Decision

EverythingAI must automatically consume knowledge from folders that the user adds to the app scope.

The user should not have to manually tell the app to consume, extract, index, embed, or analyze knowledge every time.

Once a folder is added to the EverythingAI scope, it becomes a monitored source.

## Core concept

```text
Added Source Path
  ↓
Within EverythingAI scope
  ↓
Automatic scan
  ↓
Automatic metadata indexing
  ↓
Automatic text extraction
  ↓
Automatic embeddings
  ↓
Automatic insights / classification
  ↓
Automatic organization suggestions
  ↓
Available for search, AI chat, knowledge, planning, and safe actions
```

## User experience rule

The user adds folders to the app.

EverythingAI handles the rest.

The UI should not require separate manual steps like:

- Index
- Extract
- Embed
- Generate insights
- Generate suggestions

Those can exist as advanced/debug actions, but the normal user flow must be automatic.

## Source Paths section

The UI must include a clear section for managed paths.

Recommended label:

```text
Source Paths
```

Alternative labels:

```text
Knowledge Sources
Watched Folders
EverythingAI Scope
```

The section should show all folders that EverythingAI is allowed to work with.

Each source path should show:

- folder path
- status
- last scan time
- file count
- extracted count
- embedding/knowledge status
- watch/surveillance enabled or disabled
- error state if failed

## Path states

Recommended states:

```text
added
scanning
indexed
extracting
embedding
analyzing
ready
watching
failed
paused
```

## Required actions per source path

Each source path should allow:

- Add folder
- Remove folder from scope
- Pause surveillance
- Resume surveillance
- Re-scan now
- Open in Explorer view
- View errors

## Automatic processing behavior

When a folder is added:

```text
1. Add path to source scope list
2. Start scan immediately
3. Store metadata in database
4. Extract text from supported files
5. Generate embeddings
6. Generate insights
7. Generate suggestions
8. Mark source as ready
9. Optionally start watcher/surveillance
```

When a watched folder changes:

```text
1. Debounce file event
2. Re-scan changed source
3. Skip unchanged files where possible
4. Extract only new/changed files
5. Regenerate embeddings for changed content
6. Refresh insights and suggestions
7. Update dashboard and planning view
```

## Backend mapping

Current MVP endpoints already support most of this behavior:

| Required behavior | Current endpoint |
|---|---|
| Select folder | `POST /api/select-folder` |
| Scan/index folder | `POST /api/index` |
| Extract text | `POST /api/extract` |
| Generate embeddings | `POST /api/embeddings` |
| Generate insights | `POST /api/insights` |
| Generate suggestions | `POST /api/suggestions` |
| Start surveillance | `POST /api/watch` |
| Stop surveillance | `POST /api/unwatch` |
| System status | `GET /api/status` |
| List files | `GET /api/files` |

## MVP implementation approach

For the local MVP, the source path list can initially be stored in browser local storage and mirrored to the backend watcher when surveillance is enabled.

Recommended local storage key:

```text
everythingai.ui.sourcePaths
```

Later, source paths should be persisted in the backend database as first-class records.

## Production implementation approach

In the production platform, source paths must be owned by:

```text
tenant_id
workspace_id
device_id
source_path_id
```

The installed client agent must enforce access to these paths.

The central server should never assume it can directly access local files.

## Important rule

EverythingAI should not be a manual batch tool.

It should behave like an intelligent file brain that continuously consumes and updates knowledge from the folders the user has added to its scope.

## Final principle

```text
User manages scope.
EverythingAI manages consumption.
User approves actions.
```
