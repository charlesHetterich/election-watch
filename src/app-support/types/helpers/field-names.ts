import { TypeErrorMessage } from ".";

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

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
export type Letter = Lower | Upper;

type FirstChar = Letter | "_";
type RestChar = FirstChar | Digit;
type _IsValidField<S extends string> = S extends ""
    ? true
    : S extends `${RestChar}${infer Tail}`
    ? _IsValidField<Tail>
    : false;
type IsValidField<S extends string> = S extends `${FirstChar}${infer Tail}`
    ? _IsValidField<Tail> extends true
        ? true
        : false
    : false;

/**
 * Type used to restrict function inputs to valid field
 * names with type-level errors.
 */
export type ValidField<S extends string> = IsValidField<S> extends true
    ? S
    : TypeErrorMessage<"Setting field name must contain only letters, digits, or '_' and cannot start with a digit">;
