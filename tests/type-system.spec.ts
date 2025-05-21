import { describe, it, expectTypeOf, expect } from "vitest";
import { Split, DeepLookup, PathMap } from "@lambdas/app-support/types/helpers";
import { knownChains, knownRelays } from "@lambdas/app-support";

// Split ----------------------------------------------------------
describe("Split<S>", () => {
    it("turns a dotted string literal into a tuple", () => {
        expectTypeOf<Split<"foo.bar.baz">>().toEqualTypeOf<
            ["foo", "bar", "baz"]
        >();
    });
});

// DeepLookup -----------------------------------------------------
describe("DeepLookup<T, Path>", () => {
    type Tree = { a: { b: number } };

    it("finds the node when the path exists", () => {
        expectTypeOf<DeepLookup<Tree, ["a", "b"]>>().toEqualTypeOf<number>();
    });

    it("returns never for a bad path", () => {
        expectTypeOf<DeepLookup<Tree, ["x"]>>().toEqualTypeOf<never>();
    });
});

// PathMap --------------------------------------------------------
describe("PathMap<T>", () => {
    type Tree = { foo: { bar: string; baz: { qux: boolean } } };

    it("enumerates every leaf as a dotted path", () => {
        expect(knownRelays).toEqual(["polkadot"]);
    });
});
