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
    configType: CType;
};

export type InfoConfiguration<D extends string> = Configuration<"info"> & {
    description: D;
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

type IsValidField<S extends string> = S extends "" // end of the string
    ? true
    : S extends `${RestChar}${infer Tail}` // eat one valid char
    ? IsValidField<Tail> // …and recurse
    : false; // found an invalid char

export type FieldName<S extends string> = S extends `${FirstChar}${infer Tail}` // check 1st character
    ? IsValidField<Tail> extends true
        ? S // ✅ good → keep the literal
        : "Setting names must contain only letters, digits, or '_' and cannot start with a digit"
    : "Setting names must contain only letters, digits, or '_' and cannot start with a digit";

type efffedUP = FieldName<string>;

export type SettingsConfiguration<
    Field extends FieldName<string>,
    T = any
> = Configuration<"setting"> & {
    __fieldType: T;
    fieldType: string;
    fieldName: Field;
};
function omniSetting<const Field extends FieldName<string>, T = unknown>(
    fieldName: Field,
    fieldType: string
): SettingsConfiguration<Field, T> {
    return {
        __fieldType: null as T,
        configType: "setting",
        fieldType: fieldType,
        fieldName: fieldName,
    };
}

export const Setting = {
    string<const Field extends string>(fieldName: FieldName<Field>) {
        return omniSetting<FieldName<Field>, string>(fieldName, "string");
    },

    number<const Field extends string>(fieldName: FieldName<Field>) {
        return omniSetting<FieldName<Field>, number>(fieldName, "number");
    },

    bool<const Field extends string>(fieldName: FieldName<Field>) {
        return omniSetting<FieldName<Field>, boolean>(fieldName, "boolean");
    },

    secret<const Field extends string>(fieldName: FieldName<Field>) {
        return omniSetting<FieldName<Field>, string>(fieldName, "secret");
    },
};

type TPermission = "transact" | "write-file";

export function Permission(restrictiveId: TPermission) {
    return {
        type: "permission" as const,
        fieldName: restrictiveId,
    };
}
