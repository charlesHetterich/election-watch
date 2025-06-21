import { ValidField } from "./helpers";

export enum ConfigType {
    Setting = "setting",
    Permission = "permission",
    Info = "info",
}
type ConfigurableType = `${ConfigType}`;

/**
 * ## Configuration
 *
 * Docs!
 */
export type Configuration<CType extends ConfigurableType = ConfigurableType> = {
    readonly configType: CType;
};

/**
 * ## Info Configuration
 *
 * Docs!
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

/**
 * ## SettingsConfiguration
 *
 * Docs!
 */
export type SettingsConfiguration<
    Field extends string = string,
    T = any
> = Configuration<ConfigType.Setting> & {
    readonly __fieldType: T;
    readonly fieldType: string;
    readonly fieldName: Field;
};
function omniSetting<const Field extends string, T = unknown>(
    fieldName: ValidField<Field>,
    fieldType: string
): SettingsConfiguration<Field, T> {
    return {
        __fieldType: null as T,
        configType: ConfigType.Setting,
        fieldType: fieldType,
        fieldName: fieldName as unknown as Field,
    };
}

export const Setting = {
    /**
     * DOCS!
     */
    string<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, string>(fieldName, "string");
    },

    /**
     * DOCS!
     */
    number<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, number>(fieldName, "number");
    },

    /**
     * DOCS!
     */
    bool<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, boolean>(fieldName, "boolean");
    },

    /**
     * DOCS!
     */
    secret<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, string>(fieldName, "secret");
    },
};

type TPermission = "transact" | "write-file";

export type PermissionConfiguration<T extends TPermission = TPermission> =
    Configuration<ConfigType.Permission> & {
        readonly permission: T;
    };

export function Permission<P extends TPermission>(
    restrictiveId: P
): PermissionConfiguration<P> {
    return {
        configType: ConfigType.Permission,
        permission: restrictiveId,
    };
}
