# DATA MODEL

## Core tables

### files

Stores all indexed files.

Fields:

- id
- filename
- full_path
- extension
- size
- created_at
- modified_at
- hash
- status

### file_chunks

Stores extracted text chunks.

Fields:

- id
- file_id
- chunk_text
- chunk_index

### embeddings

Stores vector embeddings.

Fields:

- id
- chunk_id
- embedding_vector

### actions

Stores all proposed and executed actions.

Fields:

- id
- action_type
- source_path
- target_path
- status (suggested, approved, executed, undone)
- confidence
- created_at

### audit_log

Tracks all changes.

Fields:

- id
- action_id
- timestamp
- user
- result

## Relationships

- One file → many chunks
- One chunk → one embedding
- One action → one file
