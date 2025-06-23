import { Setting, SettingsConfiguration } from "./settings";
import { Permission, PermissionConfiguration } from "./permissions";
import { Description, InfoConfiguration } from "./info";
import { App } from "../apps";

/**
 * Root types for *configuratbles*
 */
export enum ConfigType {
    Setting = "setting",
    Permission = "permission",
    Info = "info",
}
export type ConfigurableType = `${ConfigType}`;

/**
 * ## Configuration
 * Configurations are used by app developers to define *application-wide*
 * specifications which have direct implications on Substrate Lambda's
 * type-system within the context of the application.
 *
 * App developers use {@link Config} to define specifications.
 *
 * The following types of configurations are available:
 * - {@link SettingsConfiguration}
 * - {@link PermissionConfiguration}
 * - {@link InfoConfiguration}
 */
export type Configuration<CType extends ConfigurableType = ConfigurableType> = {
    readonly configType: CType;
};

/**
 * Type wrapper on {@link Config} to clean up in-IDE *hover docs*
 */
type ConfigInterface = {
    Description: typeof Description;
    Setting: typeof Setting;
    Permission: typeof Permission;
};

/**
 * Interface to specify app {@link Configuration}s inside of the first
 * argument of the {@link App} function.
 *
 * Configurations are used by app developers to define *application-wide*
 * specifications which have direct implications on Substrate Lambda's
 * type-system within the context of the application.
 *
 * #### Example
 * ```ts
 * import { App, Config } from "@lambdas/app-support";
 *
 * export default App(
 *     [
 *         // Give your application a description
 *         Config.Description("This is application does something!"),
 *
 *         // Define settings in your application which will appear
 *         // for use under `context.settings`
 *         Config.Setting.string("email"),
 *         Config.Setting.secret("password"),
 *
 *         // Tells us that your app requires permission to perform *transactions*
 *         // on bahalf of the user (unavailable by default)
 *         Config.Permission("transact"),
 *     ],
 *     ...someRoutes
 * )
 * ```
 */
export const Config: ConfigInterface = {
    Description,
    Setting,
    Permission,
};

export * from "./settings";
export * from "./permissions";
export * from "./info";
