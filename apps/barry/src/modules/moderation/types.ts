import type { APIUser } from "@discordjs/core";
import type { Module } from "@barry/core";

/**
 * Represents a module that allows flagging users.
 */
export interface FlaggableModule extends Module {
    /**
     * Flags all items for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to flag.
     * @param reason The reason to flag the user.
     */
    flagUser(guildID: string, channelID: string, user: APIUser, reason: string): Promise<void>;

    /**
     * Removes the flag from all items for the specified user.
     *
     * @param guildID The ID of the guild.
     * @param channelID The ID of the channel.
     * @param user The user to remove the flag of.
     */
    unflagUser(guildID: string, channelID: string, user: APIUser): Promise<void>;
}

/**
 * Represents the profiles module.
 */
export interface ProfilesModule extends FlaggableModule {
    /**
     * The settings repository for the profiles module.
     */
    profilesSettings: SettingsRepository;
}

/**
 * Represents the requests module.
 */
export interface RequestsModule extends FlaggableModule {
    /**
     * The settings repository for the requests module.
     */
    requestsSettings: SettingsRepository;
}

/**
 * Represents a simple settings repository to fetch a configured channel.
 */
export interface SettingsRepository {
    /**
     * Get the settings of the specified guild.
     *
     * @param guildID The ID of the guild.
     * @returns The settings for the specified guild.
     */
    getOrCreate(guildID: string): Promise<SettingsWithChannel>;
}

/**
 * Represents settings of a module with a configured channel.
 */
export interface SettingsWithChannel {
    /**
     * The ID of the channel.
     */
    channelID: string | null;

    /**
     * Whether the module is enabled.
     */
    enabled: boolean;
}
