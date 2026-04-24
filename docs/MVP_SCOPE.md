# MVP SCOPE

## Build strategy decision

EverythingApp will start with:

```text
Minimal custom system + integrate AnythingLLM early
```

This means we prioritize a working product quickly while reusing the strongest available open-source foundation.

## MVP objective

The MVP must prove that EverythingApp can:

1. Index a selected local folder.
2. Extract useful text and metadata from files.
3. Store file metadata and knowledge locally.
4. Search files by filename, path, and content.
5. Ask AI questions about indexed files.
6. Return answers with source references.
7. Suggest file organization actions.
8. Preview all proposed actions before execution.

## MVP must-have features

### 1. Folder selection

The user can select one or more folders to index.

### 2. File metadata indexing

Store:

- filename
- full path
- extension
- size
- created date
- modified date
- hash
- indexing status

### 3. Document parsing

Support the first file types:

- PDF
- DOCX
- TXT
- MD
- CSV
- XLSX

### 4. Search

Support:

- filename search
- path search
- content keyword search
- semantic search

### 5. AI chat

The user can ask questions such as:

```text
Where is the latest supplier contract?
What documents mention customer X?
Summarize all files related to project Y.
```

### 6. Source references

Every AI answer should reference the source file when possible.

### 7. Organization suggestions

The AI can suggest:

- tags
- better filename
- better folder location
- category

### 8. Action preview

No file action is executed without preview and approval.

## MVP out of scope

- Fully automatic file organization
- Delete automation
- Multi-user permissions
- Cloud sync
- Mobile app
- Email indexing
- Enterprise admin console

## MVP success test

The MVP is successful if a user can select a folder, index it, ask questions about the content, find source files, and receive safe organization suggestions without any automatic destructive actions.
