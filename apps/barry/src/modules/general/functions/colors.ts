import type { KEYWORD } from "color-convert/conversions.js";
import converter from "color-convert";

/**
 * Utility type to create a tuple for a given type and length.
 */
export type Tuple<T, N extends number, R extends T[] = []> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;

/**
 * The values of a color.
 */
export interface ColorValues {
    /**
     * The cyan, magenta, yellow, and black values of the color.
     */
    [ColorFormat.CMYK]: [number, number, number, number];

    /**
     * The hex value of the color.
     */
    [ColorFormat.HEX]: string;

    /**
     * The hue, saturation, and brightness of the color.
     */
    [ColorFormat.HSB]: [number, number, number];

    /**
     * The hue, saturation, and lightness of the color.
     */
    [ColorFormat.HSL]: [number, number, number];

    /**
     * The hue, saturation, and value of the color.
     */
    [ColorFormat.HSV]: [number, number, number];

    /**
     * The lightness, alpha, and beta of the color.
     */
    [ColorFormat.LAB]: [number, number, number];

    /**
     * The red, green, and blue values of the color.
     */
    [ColorFormat.RGB]: [number, number, number];

    /**
     * The name of the color.
     */
    name: string;
}

/**
 * The regular expression for a color in the RGB format.
 */
const RGB_REGEX = /^rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)/;

/**
 * The regular expression for a color in the HEX format.
 */
const HEX_REGEX = /^(#|0x)?[0-9a-fA-F]{3,8}/;

/**
 * The regular expression for a color in the HSL format.
 */
const HSL_REGEX = /^hsl\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)/;

/**
 * The regular expression for a color in the HSV format.
 */
const HSV_REGEX = /^hsv\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)/;

/**
 * The regular expression for a color in the HSB format.
 */
const HSB_REGEX = /^hsb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)/;

/**
 * The regular expression for a color in the LAB format.
 */
const LAB_REGEX = /^lab\((\d{1,3})(\.\d+)?, ?(\d{1,3})(\.\d+)?, ?(\d{1,3})(\.\d+)?\)/;

/**
 * The regular expression for a color in the CMYK format.
 */
const CMYK_REGEX = /^cmyk\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)?/;

/**
 * The supported color formats.
 */
export enum ColorFormat {
    RGB = "rgb",
    HSV = "hsv",
    HSL = "hsl",
    HSB = "hsb",
    LAB = "lab",
    HEX = "hex",
    CMYK = "cmyk"
}

/**
 * Parses the format of a color.
 *
 * @param value The color to parse.
 * @returns The format of the color.
 */
function parseFormat(value: string): ColorFormat | undefined {
    if (RGB_REGEX.test(value)) {
        return ColorFormat.RGB;
    }

    if (HSL_REGEX.test(value)) {
        return ColorFormat.HSL;
    }

    if (HSV_REGEX.test(value)) {
        return ColorFormat.HSV;
    }

    if (HSB_REGEX.test(value)) {
        return ColorFormat.HSB;
    }

    if (LAB_REGEX.test(value)) {
        return ColorFormat.LAB;
    }

    if (CMYK_REGEX.test(value)) {
        return ColorFormat.CMYK;
    }

    if (HEX_REGEX.test(value)) {
        return ColorFormat.HEX;
    }
}

/**
 * Normalizes a HEX value.
 *
 * @param value The HEX value to normalize.
 * @returns The normalized HEX value.
 */
function normalizeHEX(value: string): string {
    value = value.replace(/^#|0x/g, "");

    if (value.length === 3) {
        value = value.replace(/./g, (char) => char + char);
    }

    return value.slice(0, 6).padEnd(6, "0");
}

/**
 * Parses a color.
 *
 * @param value The color to parse.
 * @returns The parsed color.
 */
function fromHEX(value: string): ColorValues {
    const hex = normalizeHEX(value);

    return {
        [ColorFormat.CMYK]: converter.hex.cmyk(hex),
        [ColorFormat.HEX]: hex,
        [ColorFormat.HSB]: converter.hex.hsv(hex),
        [ColorFormat.HSL]: converter.hex.hsl(hex),
        [ColorFormat.HSV]: converter.hex.hsv(hex),
        [ColorFormat.LAB]: converter.hex.lab(hex),
        [ColorFormat.RGB]: converter.hex.rgb(hex),
        name: converter.hex.keyword(hex)
    };
}

/**
 * Checks if a value is a tuple of a given length.
 *
 * @param value The value to check.
 * @param length The length of the tuple.
 * @returns Whether the value is a tuple of the given length.
 */
function isLength<T, N extends number>(value: T[], length: N): value is Tuple<T, N> {
    return value.length === length;
}

/**
 * Parses a color from a string.
 *
 * @param value The string to parse.
 * @returns The parsed color.
 */
export function parseColor(value: string): ColorValues | undefined {
    const format = parseFormat(value);
    if (format === undefined) {
        const rgb = converter.keyword.rgb(value as KEYWORD);
        return rgb !== undefined
            ? fromHEX(converter.rgb.hex(rgb))
            : undefined;
    }

    if (format === ColorFormat.HEX) {
        return fromHEX(value);
    }

    const values = value
        .replace(format, "")
        .replace(/[()]/g, "")
        .split(",")
        .map((value) => parseInt(value));

    switch (format) {
        case ColorFormat.CMYK: {
            if (!isLength(values, converter.cmyk.channels)) {
                throw new Error("Invalid CMYK color.");
            }

            return fromHEX(converter.cmyk.hex(values));
        }
        case ColorFormat.HSB: {
            if (!isLength(values, converter.hsv.channels)) {
                throw new Error("Invalid HSB color.");
            }

            return fromHEX(converter.hsv.hex(values));
        }
        case ColorFormat.HSL: {
            if (!isLength(values, converter.hsl.channels)) {
                throw new Error("Invalid HSL color.");
            }

            return fromHEX(converter.hsl.hex(values));
        }
        case ColorFormat.HSV: {
            if (!isLength(values, converter.hsv.channels)) {
                throw new Error("Invalid HSV color.");
            }

            return fromHEX(converter.hsv.hex(values));
        }
        case ColorFormat.LAB: {
            if (!isLength(values, converter.lab.channels)) {
                throw new Error("Invalid LAB color.");
            }

            return fromHEX(converter.lab.hex(values));
        }
        case ColorFormat.RGB: {
            if (!isLength(values, converter.rgb.channels)) {
                throw new Error("Invalid RGB color.");
            }

            return fromHEX(converter.rgb.hex(values));
        }
    }
}

/**
 * Gets the luminance of a color.
 *
 * @param rgb The RGB values of the color.
 * @returns The luminance of the color.
 */
function getLuminance(rgb: ColorValues[ColorFormat.RGB]): number {
    const [r, g, b] = rgb.map((value) => {
        value /= 255;

        return value > 0.03928
            ? ((value + 0.055) / 1.055) ** 2.4
            : value / 12.92;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Gets the contrast score of two colors.
 *
 * @param background The background color.
 * @param foreground The foreground color.
 * @returns The contrast score of the two colors.
 */
export function getContrastScore(background: ColorValues, foreground: ColorValues): number {
    const backgroundLuminance = getLuminance(background[ColorFormat.RGB]);
    const foregroundLuminance = getLuminance(foreground[ColorFormat.RGB]);

    if (backgroundLuminance > foregroundLuminance) {
        return (backgroundLuminance + 0.05) / (foregroundLuminance + 0.05);
    }

    return (foregroundLuminance + 0.05) / (backgroundLuminance + 0.05);
}
