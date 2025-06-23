import { Setting } from "./settings";
import { Permission } from "./permissions";
import { Description } from "./info";

export enum ConfigType {
    Setting = "setting",
    Permission = "permission",
    Info = "info",
}
export type ConfigurableType = `${ConfigType}`;

/**
 * ## Configuration
 *
 * DOCS!
 */
export type Configuration<CType extends ConfigurableType = ConfigurableType> = {
    readonly configType: CType;
};

/**
 * Interface for app developers to specify app configurations.
 */
export const Config = {
    Description,
    Setting,
    Permission,
};

export * from "./settings";
export * from "./permissions";
export * from "./info";
