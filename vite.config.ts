import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@lambdas": "/src",
        },
    },
    test: {
        globals: true,
        reporters: "verbose",
        environment: "node",
    },
});
