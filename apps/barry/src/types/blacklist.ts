import type { Module } from "@barry-bot/core";

/**
 * Represents a repository for managing blacklisted users or guilds.
 */
export interface BlacklistableRepository {
    /**
     * Blacklists a user or guild.
     *
     * @param id The ID of the user or guild to blacklist.
     */
    blacklist(id: string): Promise<void>;

    /**
     * Checks whether a user or guild is blacklisted.
     *
     * @param id The ID of the user or guild to check.
     * @returns Whether the user or guild is blacklisted.
     */
    isBlacklisted(id: string): Promise<boolean>;

    /**
     * Unblacklists a user or guild.
     *
     * @param id The ID of the user or guild to unblacklist.
     */
    unblacklist(id: string): Promise<void>;
}

/**
 * Represents a module that can blacklist users and guilds.
 */
export interface BlacklistableModule extends Module {
    /**
     * The repository for managing blacklisted guilds.
     */
    blacklistedGuilds: BlacklistableRepository;

    /**
     * The repository for managing blacklisted users.
     */
    blacklistedUsers: BlacklistableRepository;
}
