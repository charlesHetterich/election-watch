import { Config } from "@lambdas/app-support";
import { Expand } from "@lambdas/app-support/types/helpers";

export type AppConfig = Expand<
    Required<
        {
            readonly settings: Record<string, any>;
        } & Omit<Config.InfoConfiguration, "configType">
    >
>;

export function loadConfigurations(config: Config.Configuration[]): AppConfig {
    let settings = {} as Record<string, any>;
    let info = {
        description: "",
    };

    for (const cfg of config) {
        switch (cfg.configType) {
            case Config.ConfigType.Setting:
                // TODO! Get real values for settings. Either grab from
                //       cache on-disk or ask from user via console
                settings[(cfg as Config.SettingsConfiguration).fieldName] = "";
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
