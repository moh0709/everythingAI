# INTEGRATIONS

## Organizor2

Status: integrated as adapted organization intelligence.

EverythingAI uses Organizor2 as a reference source for:

- content-based organization categories
- file type taxonomy
- intelligent tags
- safer filename suggestions
- preview-before-execute workflow

The current implementation does not import Organizor2 as a runtime dependency. Instead, the reusable concepts are adapted into the Node API under:

```text
services/api/src/integrations/organizor/organizationRules.js
```

This keeps EverythingAI runnable as a local API while improving organization suggestions beyond extension-only rules.

## AnythingLLM

Status: optional sync bridge implemented.

EverythingAI can upload extracted file knowledge into an AnythingLLM workspace through the document upload API when configured with:

```text
ANYTHINGLLM_BASE_URL
ANYTHINGLLM_API_KEY
ANYTHINGLLM_WORKSPACE_SLUG
ANYTHINGLLM_UPLOAD_PATH
```

CLI:

```bash
npm run sync:anythingllm -- --limit 25
```

API:

```http
POST /api/integrations/anythingllm/sync
```

The bridge exports extracted text plus source path metadata. EverythingAI still keeps SQLite as its local source of truth.

## Ollama

Status: implemented and validated with `qwen3.5:2b`.

EverythingAI uses Ollama directly for local chat over indexed sources. Configure:

```text
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:2b
OLLAMA_TIMEOUT_MS=120000
OLLAMA_NUM_PREDICT=192
```
