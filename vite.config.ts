import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@lambdas": "/src",
        },
    },
    test: {
        silent: true,
        globals: true,
        includeSource: ["src/**/*.{js,ts}"],
        reporters: "verbose",
        environment: "node",
        typecheck: {
            enabled: true,
            include: ["src/**/*.{js,ts}"],
        },
    },
});
