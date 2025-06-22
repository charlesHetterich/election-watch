import { db, SettingRow } from "./database";

const getSettingStmt = db.prepare<
    [string, string], // bound params
    { field_type: string; value: unknown } | undefined
>(
    `SELECT field_type, value 
        FROM settings
        WHERE app = ? AND field_name = ?`
);

const upsertSettingStmt = db.prepare(
    `INSERT INTO settings (app, field_name, field_type, value)
       VALUES (?, ?, ?, ?)
     ON CONFLICT(app, field_name)
        DO UPDATE SET field_type = excluded.field_type,
                      value      = excluded.value`
);

export function getSetting(app: string, field: string): unknown | undefined {
    const row = getSettingStmt.get(app, field);
    return row ? row.value : undefined;
}

/** Set or update a value (numbers, strings, Buffer, null…) */
export function setSetting(row: SettingRow) {
    upsertSettingStmt.run(row.app, row.field_name, row.field_type, row.value);
}
