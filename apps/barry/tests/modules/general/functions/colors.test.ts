import { type ColorValues, getContrastScore, parseColor } from "../../../../src/modules/general/functions/colors.js";

describe("parseColor", () => {
    it("should parse a hex color", () => {
        const color = parseColor("#FFFFFF");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a color by its name", () => {
        const color = parseColor("white");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a rgb color", () => {
        const color = parseColor("rgb(255, 255, 255)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a hsl color", () => {
        const color = parseColor("hsl(0, 0, 100)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a hsv color", () => {
        const color = parseColor("hsv(0, 0, 100)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a hsb color", () => {
        const color = parseColor("hsb(0, 0, 100)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a lab color", () => {
        const color = parseColor("lab(100, 0, 0)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should parse a cmyk color", () => {
        const color = parseColor("cmyk(0, 0, 0, 0)");

        expect(color).toContain({
            hex: "FFFFFF"
        });
    });

    it("should return undefined if the color is invalid", () => {
        const color = parseColor("invalid");

        expect(color).toBeUndefined();
    });
});

describe("getContrastScore", () => {
    it("should return the correct score if the background is white", () => {
        const background = { rgb: [255, 255, 255] } as ColorValues;
        const foreground = { rgb: [0, 0, 0] } as ColorValues;
        const score = getContrastScore(background, foreground);

        expect(score).toBe(21);
    });

    it("should return the correct score if the background is black", () => {
        const background = { rgb: [0, 0, 0] } as ColorValues;
        const foreground = { rgb: [255, 255, 255] } as ColorValues;
        const score = getContrastScore(background, foreground);

        expect(score).toBe(21);
    });

    it("should return the correct score if the background is red", () => {
        const background = { rgb: [255, 0, 0] } as ColorValues;
        const foreground = { rgb: [0, 0, 0] } as ColorValues;
        const score = getContrastScore(background, foreground);

        expect(score.toFixed(2)).toBe("5.25");
    });

    it("should return the correct score if the background is green", () => {
        const background = { rgb: [0, 255, 0] } as ColorValues;
        const foreground = { rgb: [0, 0, 0] } as ColorValues;
        const score = getContrastScore(background, foreground);

        expect(score.toFixed(2)).toBe("15.30");
    });
});
