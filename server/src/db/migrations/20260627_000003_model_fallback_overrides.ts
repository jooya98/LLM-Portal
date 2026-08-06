import type { Db } from '../types.js';

export function up(db: Db): void {
  db.exec(`
    CREATE TABLE model_fallback_overrides (
      model_db_id INTEGER PRIMARY KEY REFERENCES models(id) ON DELETE CASCADE,
      chain_json  TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function down(db: Db): void {
  db.exec(`
    DROP TABLE IF EXISTS model_fallback_overrides;
  `);
}
