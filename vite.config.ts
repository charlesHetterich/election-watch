import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@lambdas": "/src", // or use path.resolve(__dirname, 'src')
        },
    },
    test: {
        // if you need esm / ts-node support
        globals: true,
        environment: "node",
    },
});
