import { defineConfig } from "drizzle-kit";
export default defineConfig({
    dialect: "sqlite",
    schema: "./src/app-handler/database/schema.ts",
    out: "./src/app-handler/database/migrations",
});
