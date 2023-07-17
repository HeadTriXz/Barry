/**
 * Capitalizes the first letter of a string and converts the remaining letters to lowercase.
 *
 * @param value The string to be capitalized.
 * @returns The capitalized string.
 */
export function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
