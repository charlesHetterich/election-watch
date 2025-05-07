import { describe, expect, it } from "vitest";
import { mockPAPI } from "./mock";

describe("Substrate Lambdas Client", async () => {
    const [client, dotApi] = await mockPAPI();

    it("should be able to create a client", async () => {
        const bn = await dotApi.query.System.Number.getValue();
        expect(bn).toBeDefined();
        expect(bn).toEqual(25895028);
    });
    it("should be able to create a client", async () => {
        const bn = await dotApi.query.System.Number.getValue();
        expect(bn).toBeDefined();
        expect(bn).toEqual(25895028);
    });
    it("should be able to create a client", async () => {
        const bn = await dotApi.query.Balances.Freezes.getValue(
            "16UvKYsqojoivDsNXH3d5G48oXMfo1asxA4NtF2GxhoBjZHz"
        );
        expect(bn).toBeDefined();
        // expect(bn).toEqual(25895028);
    });
    it("should be able to create a client", async () => {
        const bn = await dotApi.query.System.Number.getValue();
        expect(bn).toBeDefined();
        expect(bn).toEqual(25895028);
    });
});
