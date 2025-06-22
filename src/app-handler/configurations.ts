import { Config } from "@lambdas/app-support";
import { Expand } from "@lambdas/app-support/types/helpers";
import path from "path";
import readline from "readline";
import { getSetting, setSetting } from "./cache";

/**
 * ## AppConfig
 * Holds all application-wide configurations.
 *
 * #### General App Information
 * ...
 *
 * #### Settings
 * ...
 */
export type AppConfig = Expand<
    Required<
        {
            readonly settings: Record<string, any>;
        } & Omit<Config.InfoConfiguration, "configType">
    >
>;

/**
 * Prompts the user for input via the console.
 * For "secret" type, input is hidden.
 */
async function fetchSetting(
    appName: string,
    fieldName: string,
    fieldType: Config.SettingFieldType
): Promise<unknown> {
    // Check cache
    let setting = getSetting(appName, fieldName);
    if (setting !== undefined) {
        return setting;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });

    function ask(prompt: string, hideInput = false): Promise<string> {
        if (!hideInput) {
            return new Promise((resolve) => rl.question(prompt, resolve));
        } else {
            // Hide input for secrets
            return new Promise((resolve) => {
                const stdin = process.stdin;
                const onData = (char: Buffer) => {
                    const charStr = char.toString();
                    switch (charStr) {
                        case "\n":
                        case "\r":
                        case "\u0004":
                            stdin.pause();
                            break;
                        default:
                            process.stdout.clearLine(0);
                            process.stdout.cursorTo(0);
                            process.stdout.write(
                                prompt + Array(rl.line.length + 1).join("*")
                            );
                            break;
                    }
                };
                process.stdin.on("data", onData);
                rl.question(prompt, (value) => {
                    process.stdin.removeListener("data", onData);
                    process.stdout.write("\n");
                    resolve(value);
                });
            });
        }
    }

    let prompt = `Enter value for "${fieldName}" (${fieldType}): `;

    let input: string = "";
    if (fieldType === "secret") {
        input = await ask(prompt, true);
    } else {
        input = await ask(prompt);
    }
    rl.close();

    switch (fieldType) {
        case "boolean":
            setting =
                input.trim().toLowerCase() === "true" || input.trim() === "1"
                    ? 1
                    : 0;
            break;
        case "number":
            setting = Number(input);
            break;
        case "string":
        case "secret":
        default:
            setting = input;
    }

    setSetting({
        app: appName,
        field_name: fieldName,
        field_type: fieldType,
        value: setting,
    });
    return setting;
}

export async function loadConfigurations(
    appName: string,
    config: Config.Configuration[]
): Promise<AppConfig> {
    let settings = {} as Record<string, any>;
    let info = {
        description: "",
    };

    // console.log(config);
    for (const cfg of config) {
        switch (cfg.configType) {
            case Config.ConfigType.Setting:
                const settingCfg = cfg as Config.SettingsConfiguration;
                settings[settingCfg.fieldName] = await fetchSetting(
                    appName,
                    settingCfg.fieldName,
                    settingCfg.fieldType
                );
                break;
            case Config.ConfigType.Info:
                const description = (cfg as Config.InfoConfiguration)
                    .description;
                if (description) {
                    info.description = description.trim();
                }

            case Config.ConfigType.Permission:
                break;
            default:
                throw new Error(
                    `Unknown configuration type: ${cfg.configType}`
                );
        }
    }

    return {
        ...info,
        settings: settings,
    };
}
