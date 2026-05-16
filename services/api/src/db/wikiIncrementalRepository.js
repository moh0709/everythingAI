export function ensureWikiIncrementalSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_build_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wiki_file_fingerprints (
      file_id TEXT PRIMARY KEY,
      absolute_path TEXT,
      content_hash TEXT,
      content_length INTEGER,
      extracted_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_file_fingerprints_hash
      ON wiki_file_fingerprints(content_hash);

    CREATE TABLE IF NOT EXISTS wiki_page_dependencies (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      source_ref TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wiki_page_dependencies_unique
      ON wiki_page_dependencies(page_id, file_id, source_ref);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_dependencies_file
      ON wiki_page_dependencies(file_id);

    CREATE INDEX IF NOT EXISTS idx_wiki_page_dependencies_page
      ON wiki_page_dependencies(page_id);
  `);
}

function dependencyId(pageId, fileId, sourceRef) {
  return `${pageId}:${fileId}:${sourceRef || 'source'}`;
}

export function updateWikiBuildState(db, key, value) {
  ensureWikiIncrementalSchema(db);

  db.prepare(`
    INSERT INTO wiki_build_state (
      key,
      value,
      updated_at
    ) VALUES (
      @key,
      @value,
      @updated_at
    )
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run({
    key,
    value,
    updated_at: new Date().toISOString(),
  });
}

export function saveWikiFileFingerprints(db, fingerprints = []) {
  ensureWikiIncrementalSchema(db);

  const statement = db.prepare(`
    INSERT INTO wiki_file_fingerprints (
      file_id,
      absolute_path,
      content_hash,
      content_length,
      extracted_at,
      updated_at
    ) VALUES (
      @file_id,
      @absolute_path,
      @content_hash,
      @content_length,
      @extracted_at,
      @updated_at
    )
    ON CONFLICT(file_id) DO UPDATE SET
      absolute_path = excluded.absolute_path,
      content_hash = excluded.content_hash,
      content_length = excluded.content_length,
      extracted_at = excluded.extracted_at,
      updated_at = excluded.updated_at
  `);

  const transaction = db.transaction(() => {
    for (const fingerprint of fingerprints) {
      statement.run({
        file_id: fingerprint.file_id,
        absolute_path: fingerprint.absolute_path || null,
        content_hash: fingerprint.content_hash || null,
        content_length: fingerprint.content_length || 0,
        extracted_at: fingerprint.extracted_at || null,
        updated_at: new Date().toISOString(),
      });
    }
  });

  transaction();
}

export function saveWikiPageDependencies(db, pages = []) {
  ensureWikiIncrementalSchema(db);

  db.exec('DELETE FROM wiki_page_dependencies');

  const statement = db.prepare(`
    INSERT INTO wiki_page_dependencies (
      id,
      page_id,
      file_id,
      source_ref,
      updated_at
    ) VALUES (
      @id,
      @page_id,
      @file_id,
      @source_ref,
      @updated_at
    )
  `);

  const transaction = db.transaction(() => {
    for (const page of pages) {
      for (const source of page.sources || []) {
        if (!source.file_id) continue;

        statement.run({
          id: dependencyId(page.id, source.file_id, source.ref),
          page_id: page.id,
          file_id: source.file_id,
          source_ref: source.ref || null,
          updated_at: new Date().toISOString(),
        });
      }
    }
  });

  transaction();
}

export function getWikiPagesDependingOnFiles(db, fileIds = []) {
  ensureWikiIncrementalSchema(db);

  if (!fileIds.length) return [];

  const placeholders = fileIds.map(() => '?').join(',');

  return db.prepare(`
    SELECT DISTINCT page_id
    FROM wiki_page_dependencies
    WHERE file_id IN (${placeholders})
  `).all(...fileIds);
}
