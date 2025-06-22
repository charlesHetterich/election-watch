import { Config } from "@lambdas/app-support";
import { Expand } from "@lambdas/app-support/types/helpers";
import path from "path";
import readline from "readline";
import DB from "./database";

/**
 * ## AppConfig
 * Holds all application-wide configurations.
 *
 */
export type AppConfig = Expand<
    Required<
        {
            readonly settings: Record<string, any>;
        } & Omit<Config.InfoConfiguration, "configType">
    >
>;

function processRawSetting(value: unknown, fieldType: Config.SettingFieldType) {
    switch (fieldType) {
        case "boolean":
            return value === 1;
        case "number":
            return Number(value);
        case "string":
            return String(value);
        case "secret":
            return String(value);
        default:
            throw new Error(`Unknown field type: ${fieldType}`);
    }
}

/**
 * Prompts the user for input via the console.
 * For "secret" type, input is hidden.
 */
async function fetchSetting(
    appName: string,
    fieldName: string,
    fieldType: Config.SettingFieldType
): Promise<unknown> {
    // Check for & return if available
    let setting = DB.settings.get(appName, fieldName);
    if (setting !== undefined) {
        return setting;
    }

    // Capture input from user
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    let input: string = await new Promise((resolve) =>
        rl.question(`Enter value for "${fieldName}" (${fieldType}): `, resolve)
    );
    rl.close();

    // Convert user input to the correct type
    setting = processRawSetting(input, fieldType);

    // Add setting to database
    DB.settings.set({
        appName: appName,
        fieldName: fieldName,
        fieldType: fieldType,
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
