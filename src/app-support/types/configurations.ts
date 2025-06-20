import { S } from "vitest/dist/chunks/config.d.UqE-KR0o.js";
import { TypeErrorMessage, ValidField } from "./helpers";

/**
 * I was thinking about the idea of key'd events for light clients
 * (e.g. some metered live chat app) s
 *
 * There currently no concept of key'd events with how
 * substrate storage/events work, correct?
 *
 *
 *
 * Has this been discussed before? If not I think I will
 * make a forum post.
 */

type ConfigurableType = "setting" | "permission" | "info";

/**
 *
 */
export type Configuration<CType extends ConfigurableType = ConfigurableType> = {
    readonly configType: CType;
};

export type InfoConfiguration<D extends string> = Configuration<"info"> & {
    readonly description: D;
};
export function Description<D extends string>(
    description: D
): InfoConfiguration<D> {
    return {
        configType: "info" as const,
        description,
    };
}

export type SettingsConfiguration<
    Field extends string = string,
    T = any
> = Configuration<"setting"> & {
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
        configType: "setting",
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

export type PermissionConfiguration<T extends TPermission> =
    Configuration<"permission"> & {
        readonly permission: T;
    };

export function Permission<P extends TPermission>(
    restrictiveId: P
): PermissionConfiguration<P> {
    return {
        configType: "permission",
        permission: restrictiveId,
    };
}
