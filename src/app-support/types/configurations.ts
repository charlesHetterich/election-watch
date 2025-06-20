import { S } from "vitest/dist/chunks/config.d.UqE-KR0o.js";
import { TypeErrorMessage } from "./helpers";

export class Settings {
    private trustedMachines: string[] = [];
    private accounts: string[] = [];
    private appSettings: Record<string, object> = {};
}

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

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Lower =
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "g"
    | "h"
    | "i"
    | "j"
    | "k"
    | "l"
    | "m"
    | "n"
    | "o"
    | "p"
    | "q"
    | "r"
    | "s"
    | "t"
    | "u"
    | "v"
    | "w"
    | "x"
    | "y"
    | "z";

type Upper = Uppercase<Lower>;

type FirstChar = Lower | Upper | "_"; // cannot be a digit
type RestChar = FirstChar | Digit; // anything except other symbols

type _IsValidField<S extends string> = S extends "" // end of the string
    ? true
    : S extends `${RestChar}${infer Tail}` // eat one valid char
    ? _IsValidField<Tail> // …and recurse
    : false; // found an invalid char

export type IsValidField<S extends string> =
    S extends `${FirstChar}${infer Tail}` // check 1st character
        ? _IsValidField<Tail> extends true
            ? true
            : false
        : false;

export type ValidField<S extends string> = S extends `${FirstChar}${infer Tail}` // check 1st character
    ? _IsValidField<Tail> extends true
        ? S
        : TypeErrorMessage<"Setting names must contain only letters, digits, or '_' and cannot start with a digit">
    : TypeErrorMessage<"Setting names must contain only letters, digits, or '_' and cannot start with a digit">;

// Setting names must contain only letters, digits, or '_' and cannot start with a digit
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
