import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import DB from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { desc, eq } from "drizzle-orm";

import { logs, settings } from "./schema";

/**
 * Store migrations in this directory
 */
const MIGRATIONS_DIR = `${dirname(fileURLToPath(import.meta.url))}/migrations`;

/**
 * Store database inside of bin
 */
const DB_FILE = join(process.cwd(), "bin", "sl_database.db");

// Open database connection & update table structures
// if new migrations are available
if (!existsSync(dirname(DB_FILE)))
    mkdirSync(dirname(DB_FILE), { recursive: true });
const db = drizzle(new DB(DB_FILE));
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

/**
 * Used to interface with Substrate Lambdas internal database
 */
export default {
    /**
     * Interface to interact with {@link settings} table
     */
    settings: {
        /**
         * Get a setting value from database
         *
         * @param app   - The name of the application which owns the setting
         * @param field - The variable name for the setting
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
         * Set a setting value in database
         *
         * @param row - A setting to insert/update
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

    logs: {
        /**
         * Write logs to the logs table.
         * `timestamp` defaults to `Date.now()`.
         */
        push(app: string, content: string, timestamp = Date.now()) {
            db.insert(logs).values({ timestamp, app, content }).run();
        },

        /**
         * Get paginated logs of an app
         */
        getPaged(appId: string, page = 0, perPage = 100) {
            return db
                .select()
                .from(logs)
                .where(eq(logs.app, appId))
                .orderBy(desc(logs.timestamp))
                .limit(perPage)
                .offset(page * perPage)
                .all();
        },
    },
};

if (import.meta.vitest) {
    const { describe, it } = import.meta.vitest;

    /**
     * Have to setup mock database & migrations locations...
     *
     * Not sure how testing migrations should work
     * while keeping the tests up-to-date
     */

    it.todo("test using existing database works", () => {});
    it.todo("test creating new database works", () => {});
    it.todo("test migration updates work", () => {});

    describe("settings", () => {
        it.todo("test `settings` interface works", () => {});
    });
}
