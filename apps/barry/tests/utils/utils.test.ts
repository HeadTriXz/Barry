import { describe, expect, it } from "vitest";
import { capitalize } from "../../src/utils/index.js";

describe("utils", () => {
    describe("capitalize", () => {
        it("should capitalize the first letter of the string", () => {
            const value = capitalize("hello world");

            expect(value).toBe("Hello world");
        });

        it("should make the rest of the string lowercase", () => {
            const value = capitalize("HELLO WORLD");

            expect(value).toBe("Hello world");
        });
    });
});
