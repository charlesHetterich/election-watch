import { TypeErrorMessage } from ".";

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
