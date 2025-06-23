import { ConfigType, Configuration } from ".";

/**
 * ## Info Configuration
 *
 * DOCS!
 */
export type InfoConfiguration<D extends string = string> =
    Configuration<ConfigType.Info> & {
        readonly description?: D;
    };

export function Description<D extends string>(
    description: D
): InfoConfiguration<D> {
    return {
        configType: ConfigType.Info,
        description,
    };
}
