/**
 * The regex to match the duration.
 */
const REGEX = /(\d+)\s*(w|weeks?|d|days?|h|hours?|m|mins?|minutes?|s|seconds?)/gi;

/**
 * The time units and their corresponding values in seconds.
 */
const TIME_UNITS: Record<string, number> = {
    w: 604800,
    d: 86400,
    h: 3600,
    m: 60,
    s: 1
};

/**
 * Parses a string into a duration in seconds.
 *
 * @param value The string to parse.
 * @returns The duration in seconds.
 */
export function getDuration(value: string): number {
    let totalSeconds = 0;
    let match;

    while ((match = REGEX.exec(value)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2][0].toLowerCase();
        if (TIME_UNITS[unit]) {
            totalSeconds += value * TIME_UNITS[unit];
        }
    }

    return totalSeconds;
}
