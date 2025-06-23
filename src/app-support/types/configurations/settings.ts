import { ConfigType, Configuration } from ".";
import { ValidField } from "../helpers";

export enum FieldType {
    String = "string",
    Number = "number",
    Bool = "boolean",
    Secret = "secret",
}
export type SettingFieldType = `${FieldType}`;

/**
 * ## SettingsConfiguration
 *
 * DOCS!
 */
export type SettingsConfiguration<
    Field extends string = string,
    T = any
> = Configuration<ConfigType.Setting> & {
    readonly __fieldType: T;
    readonly fieldType: SettingFieldType;
    readonly fieldName: Field;
};

function omniSetting<const Field extends string, T = unknown>(
    fieldName: ValidField<Field>,
    fieldType: SettingFieldType
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
        return omniSetting<Field, string>(fieldName, FieldType.String);
    },

    /**
     * DOCS!
     */
    number<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, number>(fieldName, FieldType.Number);
    },

    /**
     * DOCS!
     */
    bool<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, boolean>(fieldName, FieldType.Bool);
    },

    /**
     * DOCS!
     */
    secret<const Field extends string>(fieldName: ValidField<Field>) {
        return omniSetting<Field, string>(fieldName, FieldType.Secret);
    },
};
