import DB from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const MIGRATIONS_DIR = `${dirname(fileURLToPath(import.meta.url))}/migrations`;
const DB_DIR = join(process.cwd(), "bin");

// Open database connection
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const raw_db = new DB(join(DB_DIR, "sl_database.db"));
export const db = drizzle(raw_db);

// Update table structures if new migrations are available
await migrate(db, {
    migrationsFolder: MIGRATIONS_DIR,
});

export * from "./schema";
