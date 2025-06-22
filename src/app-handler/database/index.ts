import DB from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { settings } from "./schema";
import { eq } from "drizzle-orm";

const MIGRATIONS_DIR = `${dirname(fileURLToPath(import.meta.url))}/migrations`;
const DB_DIR = join(process.cwd(), "bin");

// Open database connection
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const raw_db = new DB(join(DB_DIR, "sl_database.db"));
const db = drizzle(raw_db);

// Update table structures if new migrations are available
await migrate(db, {
    migrationsFolder: MIGRATIONS_DIR,
});

/**
 * Used to interface with Substrate Lambdas internal database
 */
export default {
    /**
     * Table storing settings for each application
     */
    settings: {
        /**
         * Get a setting value
         */
        get(
            app: typeof settings.$inferInsert.appName,
            field: typeof settings.$inferInsert.fieldName
        ): unknown | undefined {
            const row = db
                .select()
                .from(settings)
                .where(
                    eq(settings.appName, app) && eq(settings.fieldName, field)
                )
                .get();
            return row ? row.value : undefined;
        },

        /**
         * Set a setting value
         */
        async set(row: typeof settings.$inferInsert) {
            await db
                .insert(settings)
                .values(row)
                .onConflictDoUpdate({
                    target: [settings.appName, settings.fieldName],
                    set: { value: row.value, fieldType: row.fieldType },
                });
        },
    },
};

export * from "./schema";
