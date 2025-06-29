import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { LambdaApp } from "./app";
import { AppsManager } from "./manager";

/**
 * Start all apps from the `appsDir` directory
 */
export async function startApps(appsDir: string, manager: AppsManager) {
    const HOST_PORT = "7001";

    // Find all apps in `appsDir`
    let appNames: string[];
    if (fs.existsSync(appsDir)) {
        appNames = fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dir) => dir.isDirectory() && !dir.name.startsWith("_"))
            .map((dirent) => dirent.name);
    } else {
        throw new Error(`Apps directory ${appsDir} not found.`);
    }

    // Start each app inside its own Deno container
    for (const appName of appNames) {
        const token = appName;
        manager.apps[token] = new LambdaApp(appName);
        const p = spawn(
            "deno",
            [
                "run",
                "--quiet",
                `--allow-net=127.0.0.1:${HOST_PORT}`,
                "--no-prompt",
                path.join(appsDir, appName, "index.ts"),
            ],
            {
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env, HOST_PORT, SESSION_TOKEN: token },
            }
        );

        // TODO! capture logs from `p` into DB
    }
}

if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest;
    const appsDir = "tests/mock-apps";

    test("should throw an error on non-existed appsDir", async () => {
        await expect(() =>
            startApps("invalid-path", new AppsManager())
        ).rejects.toBeDefined();
    });

    test("should find apps in valid `appsDir` correctly", async () => {
        const manager = new AppsManager();
        await startApps(appsDir, manager);
        expect(manager["apps"].map((app) => app.name)).toContain("no-index");
    });

    test("should load all valid/invalid apps correctly", async () => {
        const manager = new AppsManager();
        // Load all apps
        await startApps(appsDir, manager);
        const apps = manager["apps"].reduce((acc, app) => {
            acc[app.name] = app;
            return acc;
        }, {} as Record<string, LambdaApp>);

        // Check simple invalid apps
        expect(apps["no-index"].name).toEqual("no-index");
        expect(apps["no-index"].alive).toBe(false);
        expect(apps["no-index"].handlers).toHaveLength(0);
        expect(apps["invalid-module"].alive).toBe(false);
        expect(apps["invalid-module"].handlers).toHaveLength(0);

        // Check simple valid apps
        expect(apps["simple-event"].name).toEqual("simple-event");
        expect(apps["simple-event"].alive).toBe(true);
        expect(apps["simple-event"].handlers).toHaveLength(1);
        expect(apps["simple-storage"].alive).toBe(true);
        expect(apps["simple-storage"].handlers).toHaveLength(3);
    });
}
