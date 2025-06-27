import {
    ConfigType,
    Configuration,
    FieldType,
    InfoConfiguration,
    SettingFieldType,
    SettingsConfiguration,
} from "@lambdas/app-support";
import { Expand } from "@lambdas/app-support/types/helpers";
import readline from "readline";
import DB from "./database";

/**
 * ## AppConfig
 * Holds all application-wide configurations.
 */
export type AppConfig = Expand<
    Required<
        {
            readonly settings: Record<string, any>;
        } & Omit<InfoConfiguration, "configType">
    >
>;

/**
 * Converts raw text input to the appropriate setting
 */
function processRawSetting(value: string, fieldType: SettingFieldType) {
    switch (fieldType) {
        case FieldType.Bool:
            const truthies = ["1", "true", "yes", "y"];
            return truthies.includes(value.toLowerCase());
        case FieldType.Number:
            return Number(value);
        case FieldType.String:
            return String(value);
        case FieldType.Secret:
            return String(value);
        default:
            throw new Error(`Unknown field type: ${fieldType}`);
    }
}

/**
 * Get the value for some setting in an app.
 */
async function fetchSetting(
    appName: string,
    fieldName: string,
    fieldType: SettingFieldType
): Promise<unknown> {
    // Check for setting in DB & return if available
    let setting = DB.settings.get(appName, fieldName);
    if (setting !== undefined) {
        return setting;
    }

    // Otherwise, prompt user via console for setting value
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    let input: string = await new Promise((resolve) =>
        rl.question(`Enter value for "${fieldName}" (${fieldType}): `, resolve)
    );
    rl.close();
    setting = processRawSetting(input, fieldType);

    // Store setting in DB & return
    DB.settings.set({
        appName: appName,
        fieldName: fieldName,
        fieldType: fieldType,
        value: setting,
    });
    return setting;
}

/**
 * Load all {@link Configuration}s specified by the given app.
 */
export async function loadConfigurations(
    appName: string,
    config: Configuration[]
): Promise<AppConfig> {
    let settings = {} as Record<string, any>;
    let info = {
        description: "",
    };

    for (const cfg of config) {
        switch (cfg.configType) {
            case ConfigType.Setting:
                const settingCfg = cfg as SettingsConfiguration;
                settings[settingCfg.fieldName] = await fetchSetting(
                    appName,
                    settingCfg.fieldName,
                    settingCfg.fieldType
                );
                break;
            case ConfigType.Info:
                const description = (cfg as InfoConfiguration).description;
                if (description) {
                    info.description = description.trim();
                }
                break;
            case ConfigType.Permission:
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

if (import.meta.vitest) {
    const { describe, it } = import.meta.vitest;

    it.todo("...", () => {});
}
