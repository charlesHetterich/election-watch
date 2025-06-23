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

if (import.meta.vitest) {
    const { expectTypeOf, describe, it } = import.meta.vitest;

    describe("`IsValidField`", () => {
        it("gives back exact string on strings of valid variable names", () => {
            expectTypeOf<ValidField<"someVar">>().toExtend<"someVar">();
            expectTypeOf<ValidField<"__weird_var">>().toExtend<"__weird_var">();
            expectTypeOf<ValidField<"someVar2">>().toExtend<"someVar2">();
        });

        it("gives a `TypeErrorMessage` on strings of invalid variable names", () => {
            expectTypeOf<
                ValidField<"2noLettersAtStart">
            >().toExtend<TypeErrorMessage>();
            expectTypeOf<
                ValidField<"noWeirdChars!">
            >().toExtend<TypeErrorMessage>();
        });
    });
}
