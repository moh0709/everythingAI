export function getAppSetting(db, key) {
  const row = db.prepare('SELECT value_json FROM app_settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value_json) : null;
}

export function setAppSetting(db, key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value_json, updated_at)
    VALUES (@key, @valueJson, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run({
    key,
    valueJson: JSON.stringify(value),
    updatedAt: new Date().toISOString(),
  });
}
