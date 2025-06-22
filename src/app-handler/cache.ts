import { eq } from "drizzle-orm";
import { db } from "./database";
import { settings } from "./database";

export function getSetting(
    app: typeof settings.$inferInsert.appName,
    field: typeof settings.$inferInsert.fieldName
): unknown | undefined {
    const row = db
        .select()
        .from(settings)
        .where(eq(settings.appName, app) && eq(settings.fieldName, field))
        .get();
    return row ? row.value : undefined;
}

export async function setSetting(row: typeof settings.$inferInsert) {
    await db
        .insert(settings)
        .values(row)
        .onConflictDoUpdate({
            target: [settings.appName, settings.fieldName],
            set: { value: row.value, fieldType: row.fieldType },
        });
}
