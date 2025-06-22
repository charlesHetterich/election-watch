import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { Config } from "@lambdas/app-support";

const DB_DIR = join(process.cwd(), "bin");
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const db = new Database(join(DB_DIR, "sl_database.db"));

export interface SettingRow {
    app: string;
    field_name: string;
    field_type: Config.SettingFieldType;
    value: unknown;
}

export interface LogRow {
    id: number;
    timestamp: number;
    app: string;
    content: string;
}

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  app        TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (
                field_type IN ('string','number','boolean','secret')
              ),
  value,
  PRIMARY KEY (app, field_name)
);

CREATE INDEX IF NOT EXISTS idx_settings_app
  ON settings (app);

CREATE TABLE IF NOT EXISTS logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp  INTEGER NOT NULL,   -- epoch-ms
  app        TEXT NOT NULL,
  content    TEXT NOT NULL,
  FOREIGN KEY (app) REFERENCES settings(app) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_app_ts
  ON logs (app, timestamp DESC);
`);

export { db };
