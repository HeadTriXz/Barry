import {
    type APIUser,
    type DefaultUserAvatarAssets,
    CDNRoutes,
    RouteBases
} from "@discordjs/core";

/**
 * Gets the creation timestamp of a Snowflake.
 *
 * @param id The snowflake ID.
 * @returns The creation timestamp in milliseconds.
 */
export function getCreatedAt(id: string): number {
    return getDiscordEpoch(id) + 1420070400000;
}

/**
 * Get the hash for the default avatar of a user if there is no avatar set.
 *
 * @param user The user to get the default avatar hash of.
 * @returns The hash for the default avatar of the user.
 */
export function getDefaultAvatar(user: APIUser): DefaultUserAvatarAssets {
    if (user.discriminator === "0") {
        return getDiscordEpoch(user.id) % 6 as DefaultUserAvatarAssets;
    }

    return Number(user.discriminator) % 5 as DefaultUserAvatarAssets;
}

/**
 * Get the URL of the default avatar of a user.
 *
 * @param user The user to get the default avatar of.
 * @returns The URL of the default avatar of a user.
 */
export function getDefaultAvatarURL(user: APIUser): string {
    return RouteBases.cdn + CDNRoutes.defaultUserAvatar(getDefaultAvatar(user));
}

/**
 * Gets the Discord epoch timestamp from a Snowflake.
 *
 * @param id The snowflake ID.
 * @returns The Discord epoch timestamp in milliseconds.
 */
export function getDiscordEpoch(id: string): number {
    return Number(BigInt(id) >> 22n);
}
