import type { Db } from '../types.js';

export function up(db: Db): void {
  db.exec(`
    CREATE TABLE media_fallback_overrides (
      media_model_db_id INTEGER PRIMARY KEY REFERENCES media_models(id) ON DELETE CASCADE,
      chain_json  TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE embedding_fallback_overrides (
      family TEXT PRIMARY KEY,
      chain_json  TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function down(db: Db): void {
  db.exec(`
    DROP TABLE IF EXISTS media_fallback_overrides;
  `);

  db.exec(`
    DROP TABLE IF EXISTS embedding_fallback_overrides;
  `);
}
