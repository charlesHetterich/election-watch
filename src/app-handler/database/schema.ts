import {
    sqliteTable,
    text,
    integer,
    index,
    primaryKey,
    blob,
} from "drizzle-orm/sqlite-core";
import { desc } from "drizzle-orm";

export const settings = sqliteTable(
    "settings",
    {
        appName: text("app").notNull(),
        fieldName: text("key").notNull(),
        fieldType: text("field_type", {
            enum: ["string", "number", "boolean", "secret"],
        }).notNull(),
        value: blob("value", { mode: "json" }).notNull(),
    },
    (t) => [primaryKey({ columns: [t.appName, t.fieldName] })]
);

export const logs = sqliteTable(
    "logs",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        timestamp: integer("timestamp", { mode: "number" }).notNull(),
        app: text("app").notNull(),
        content: text("content").notNull(),
    },
    (t) => [index("idx_logs_app_ts_desc").on(t.app, desc(t.timestamp))]
);
